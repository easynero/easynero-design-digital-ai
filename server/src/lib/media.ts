import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { put } from "@vercel/blob";

const MAX_REFERENCE_BYTES = 100 * 1024 * 1024;

function isPrivateIp(address: string) {
  if (address === "::1" || address === "0.0.0.0") return true;
  if (address.startsWith("10.") || address.startsWith("127.") || address.startsWith("169.254.")) return true;
  if (address.startsWith("192.168.")) return true;
  const [a, b] = address.split(".").map(Number);
  if (a === 172 && b >= 16 && b <= 31) return true;
  const normalized = address.toLowerCase();
  return normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

async function assertPublicHttps(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Media references must use HTTPS URLs.");
  if (url.username || url.password) throw new Error("Media URLs cannot contain credentials.");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Local media URLs are not allowed.");

  if (isIP(url.hostname)) {
    if (isPrivateIp(url.hostname)) throw new Error("Private network media URLs are not allowed.");
  } else {
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
      throw new Error("The media URL resolved to a private or unavailable address.");
    }
  }
  return url;
}

export async function fetchMedia(rawUrl: string, acceptedPrefixes: string[]) {
  await assertPublicHttps(rawUrl);
  const response = await fetch(rawUrl, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download media (${response.status}).`);
  await assertPublicHttps(response.url);

  const mimeType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0];
  if (!acceptedPrefixes.some((prefix) => mimeType.startsWith(prefix))) {
    throw new Error(`Unsupported media type: ${mimeType}.`);
  }

  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_REFERENCE_BYTES) throw new Error("Reference media exceeds 100 MB.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_REFERENCE_BYTES) throw new Error("Reference media exceeds 100 MB.");
  return { bytes, mimeType };
}

export async function persistGeneratedMedia(
  data: string,
  mimeType: string,
  kind: "images" | "videos" | "audio",
) {
  const bytes = Buffer.from(data, "base64");
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
    return { bytes, url: undefined };
  }

  const extension = mimeType.includes("png") ? "png" : mimeType.includes("jpeg") ? "jpg" : mimeType.includes("wav") ? "wav" : "mp4";
  const asset = await put(`design-digital/${kind}/asset.${extension}`, bytes, {
    access: "public",
    addRandomSuffix: true,
    contentType: mimeType,
    multipart: bytes.byteLength > 4 * 1024 * 1024,
  });
  return { bytes, url: asset.url };
}
