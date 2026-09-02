import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { timingSafeEqual } from "node:crypto";

const DEFAULT_RESOURCE_URL = "https://design-digital-ai-nine.vercel.app/api/mcp";

let cachedIssuer: string | undefined;
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function normalizeIssuer(value: string | undefined) {
  if (!value?.trim()) return undefined;

  try {
    const candidate = value.trim().match(/^https?:\/\//i) ? value.trim() : `https://${value.trim()}`;
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return undefined;
    return `${url.origin}${url.pathname.replace(/\/*$/, "/")}`;
  } catch {
    return undefined;
  }
}

export function getAuth0Issuer() {
  return normalizeIssuer(process.env.AUTH0_ISSUER_BASE_URL || process.env.AUTH0_DOMAIN);
}

export function getMcpResourceUrl() {
  const configured = process.env.MCP_RESOURCE_URL?.trim();
  if (configured) return configured.replace(/#.*$/, "").replace(/\/+$/, "");

  const base = (process.env.PUBLIC_BASE_URL || DEFAULT_RESOURCE_URL.replace(/\/api\/mcp$/, "")).replace(/\/+$/, "");
  return `${base}/api/mcp`;
}

export function getMcpResourceOrigin() {
  return new URL(getMcpResourceUrl()).origin;
}

export function getAuth0Audience() {
  return process.env.AUTH0_AUDIENCE?.trim() || getMcpResourceUrl();
}

export function getRequiredScopes() {
  const configured = process.env.MCP_REQUIRED_SCOPES;
  if (configured === undefined) return ["creative:generate"];
  return configured.split(/[ ,]+/).map((scope) => scope.trim()).filter(Boolean);
}

function getJwks(issuer: string) {
  if (!cachedJwks || cachedIssuer !== issuer) {
    cachedIssuer = issuer;
    cachedJwks = createRemoteJWKSet(new URL(".well-known/jwks.json", issuer));
  }
  return cachedJwks;
}

function secureCompare(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function scopesFromPayload(payload: JWTPayload) {
  const scopes = new Set<string>();
  if (typeof payload.scope === "string") {
    payload.scope.split(" ").filter(Boolean).forEach((scope) => scopes.add(scope));
  }
  if (Array.isArray(payload.permissions)) {
    payload.permissions.filter((permission): permission is string => typeof permission === "string").forEach((permission) => scopes.add(permission));
  }
  return [...scopes];
}

function staticTokenAuthInfo(token: string): AuthInfo | undefined {
  const expected = process.env.MCP_ACCESS_TOKEN;
  if (!expected || !secureCompare(token, expected)) return undefined;

  return {
    token,
    clientId: "design-digital-owner",
    scopes: ["creative:generate"],
    resource: new URL(getMcpResourceUrl()),
    extra: { authentication: "static-bearer" },
  };
}

/**
 * Validate either the development bearer token or an Auth0 access token.
 * The static token remains available for local/CI clients; ChatGPT uses Auth0.
 */
export async function verifyMcpToken(_request: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const staticAuth = staticTokenAuthInfo(bearerToken);
  if (staticAuth) return staticAuth;

  const issuer = getAuth0Issuer();
  const audience = getAuth0Audience();
  if (!issuer || !audience) return undefined;

  try {
    const { payload } = await jwtVerify(bearerToken, getJwks(issuer), {
      issuer,
      audience,
    });
    const clientId = typeof payload.azp === "string" ? payload.azp : typeof payload.sub === "string" ? payload.sub : "auth0-client";

    return {
      token: bearerToken,
      clientId,
      scopes: scopesFromPayload(payload),
      expiresAt: payload.exp,
      resource: new URL(audience),
      extra: { ...payload, authentication: "auth0" },
    };
  } catch {
    return undefined;
  }
}
