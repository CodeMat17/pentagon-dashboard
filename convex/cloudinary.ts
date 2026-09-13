/**
 * Minimal Cloudinary client — signing, signed upload and destroy over plain
 * `fetch` + Web Crypto, so it runs in both the Convex runtime and Node actions
 * without pulling in the Cloudinary SDK.
 *
 * Credentials live in the Convex deployment env (Convex does not read
 * `.env.local`): CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 */

export const UPLOAD_FOLDER = "pentagon";

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the Convex deployment.",
    );
  }
  return { cloudName, apiKey, apiSecret };
}

const now = () => String(Math.floor(Date.now() / 1000));

/** Cloudinary's signature: SHA-1 of the sorted `k=v&k=v` params + the secret. */
export async function sign(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(payload + apiSecret),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signedPost(endpoint: "upload" | "destroy", params: Record<string, string>, extra: Record<string, string> = {}) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const body = new FormData();
  for (const [key, value] of Object.entries({ ...params, ...extra })) body.append(key, value);
  body.append("api_key", apiKey);
  body.append("signature", await sign(params, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/${endpoint}`, {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error(`Cloudinary ${endpoint} failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

/** Server-side upload; `file` may be a remote URL, which Cloudinary fetches itself. */
export async function uploadImage(file: string) {
  // `file` is not part of the signature — Cloudinary excludes it.
  const result = await signedPost("upload", { folder: UPLOAD_FOLDER, timestamp: now() }, { file });
  return { publicId: result.public_id as string, url: result.secure_url as string };
}

export async function destroyImage(publicId: string) {
  await signedPost("destroy", { public_id: publicId, timestamp: now() });
}
