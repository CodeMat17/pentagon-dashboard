import { v } from "convex/values";

import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { image } from "./schema";
import { requireEditor } from "./auth";

/**
 * Convex storage, with one rule: a file never outlives the row that points at it.
 *
 * Uploads go browser → Convex directly (no bytes through this backend), and every
 * mutation that replaces or deletes an image calls `discard`/`discardMany` below,
 * so the storage bucket and the database can never drift apart.
 */

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireEditor(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Turns a freshly uploaded `storageId` into the stored image shape.
 *
 * The URL is resolved exactly once, here, and denormalised onto the content row —
 * so no read path ever awaits `ctx.storage.getUrl`, and a gallery of 40 images
 * costs one index scan instead of 41 storage round trips.
 */
export const finalize = mutation({
  args: { storageId: v.id("_storage"), alt: v.string() },
  returns: image,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Upload did not complete — try again.");
    return { storageId: args.storageId, url, alt: args.alt.trim() };
  },
});

/** Deletes an orphaned upload (e.g. the editor cancelled the form). */
export const discard = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.storage.delete(args.storageId);
    return null;
  },
});

/* ---------------------------------------------------------------- internals */

type StoredImage = { storageId: Id<"_storage">; url: string; alt: string };

/**
 * Deletes storage files for images that the caller is dropping.
 *
 * Deletion is best-effort: a missing file must not roll back the content change
 * that prompted it, otherwise one manual bucket edit locks the row forever.
 */
export async function deleteImages(
  ctx: MutationCtx,
  images: readonly StoredImage[] | undefined,
) {
  if (!images?.length) return;
  await Promise.all(
    images.map((img) => ctx.storage.delete(img.storageId).catch(() => undefined)),
  );
}

/** The images present in `before` but gone from `after`. */
export function orphaned(
  before: readonly StoredImage[] | undefined,
  after: readonly StoredImage[] | undefined,
) {
  if (!before?.length) return [];
  const kept = new Set((after ?? []).map((img) => img.storageId));
  return before.filter((img) => !kept.has(img.storageId));
}
