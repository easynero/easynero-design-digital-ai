import { generateProtectedResourceMetadata, metadataCorsOptionsRequestHandler } from "mcp-handler";
import { getAuth0Issuer, getMcpResourceUrl, getRequiredScopes } from "@/lib/auth";

export const runtime = "nodejs";

export function GET() {
  const issuer = getAuth0Issuer();
  if (!issuer) {
    return Response.json(
      { error: "Auth0 is not configured. Set AUTH0_DOMAIN or AUTH0_ISSUER_BASE_URL on the server." },
      { status: 503 },
    );
  }

  return Response.json(
    generateProtectedResourceMetadata({
      authServerUrls: [issuer],
      resourceUrl: getMcpResourceUrl(),
      additionalMetadata: {
        scopes_supported: getRequiredScopes(),
      },
    }),
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}

export function OPTIONS() {
  return metadataCorsOptionsRequestHandler()();
}

