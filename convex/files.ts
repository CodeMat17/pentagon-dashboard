import { v } from "convex/values";

import { action, internalAction, internalQuery, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireEditor } from "./auth";
import { UPLOAD_FOLDER, cloudinaryConfig, destroyImage, sign } from "./cloudinary";

/**
 * Images live on Cloudinary; Convex keeps only `{ publicId, url, alt }` on the
 * content row. One rule still holds: a file never outlives the row pointing at it.
 *
 * Uploads go browser → Cloudinary directly, authorised by a short-lived signature
 * minted here (the API secret never leaves Convex). Every mutation that replaces or
 * deletes an image calls `deleteImages`, which schedules the Cloudinary destroy.
 *
 * Rows written before the move may still carry a Convex `storageId`; those files
 * are deleted from Convex storage instead.
 */

export const assertEditor = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireEditor(ctx);
    return null;
  },
});

/** Signed parameters for one browser upload (Cloudinary accepts them for an hour). */
export const signUpload = action({
  args: {},
  returns: v.object({
    cloudName: v.string(),
    apiKey: v.string(),
    folder: v.string(),
    timestamp: v.string(),
    signature: v.string(),
  }),
  handler: async (ctx) => {
    await ctx.runQuery(internal.files.assertEditor, {});
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await sign({ folder: UPLOAD_FOLDER, timestamp }, apiSecret);
    return { cloudName, apiKey, folder: UPLOAD_FOLDER, timestamp, signature };
  },
});

/** Deletes an orphaned upload (e.g. the editor cancelled the form). */
export const discard = mutation({
  args: { publicId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.scheduler.runAfter(0, internal.files.destroy, { publicIds: [args.publicId] });
    return null;
  },
});

/**
 * Best-effort: this runs after the content change has committed, and a file
 * already missing from Cloudinary must not fail the rest of the batch.
 */
export const destroy = internalAction({
  args: { publicIds: v.array(v.string()) },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const results = await Promise.allSettled(args.publicIds.map(destroyImage));
    for (const result of results) {
      if (result.status === "rejected") console.error(result.reason);
    }
    return null;
  },
});

/* ---------------------------------------------------------------- internals */

type StoredImage = {
  publicId?: string;
  storageId?: Id<"_storage">;
  url: string;
  alt: string;
};

/** Deletes the files behind images the caller is dropping. */
export async function deleteImages(
  ctx: MutationCtx,
  images: readonly StoredImage[] | undefined,
) {
  if (!images?.length) return;
  const publicIds = images.flatMap((img) => (img.publicId ? [img.publicId] : []));
  if (publicIds.length) {
    await ctx.scheduler.runAfter(0, internal.files.destroy, { publicIds });
  }
  await Promise.all(
    images.flatMap((img) =>
      img.storageId ? [ctx.storage.delete(img.storageId).catch(() => undefined)] : [],
    ),
  );
}

/** The images present in `before` but gone from `after`. */
export function orphaned(
  before: readonly StoredImage[] | undefined,
  after: readonly StoredImage[] | undefined,
) {
  if (!before?.length) return [];
  const kept = new Set((after ?? []).map((img) => img.url));
  return before.filter((img) => !kept.has(img.url));
}
