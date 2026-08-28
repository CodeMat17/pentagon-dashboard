import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { image } from "./schema";
import { requireEditor } from "./auth";
import { deleteImages } from "./files";

/**
 * The gallery is the one place where image handling has to be bulk: editors drop
 * a dozen files at once, so `addMany` writes them in a single mutation and
 * `removeMany` deletes rows and storage files together.
 */

/** Public. Every image, in display order — the grid filters client-side. */
export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("galleryImages").withIndex("by_order").collect(),
});

export const addMany = mutation({
  args: {
    images: v.array(
      v.object({ image, category: v.string(), tall: v.boolean() }),
    ),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    // One read to find the tail of the order sequence, then straight appends.
    const last = await ctx.db.query("galleryImages").withIndex("by_order").order("desc").first();
    let order = (last?.order ?? -1) + 1;
    for (const item of args.images) {
      await ctx.db.insert("galleryImages", { ...item, order: order++ });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("galleryImages"),
    alt: v.string(),
    category: v.string(),
    tall: v.boolean(),
  },
  handler: async (ctx, { id, alt, category, tall }) => {
    await requireEditor(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) return;
    await ctx.db.patch(id, {
      image: { ...existing.image, alt },
      category,
      tall,
    });
  },
});

export const removeMany = mutation({
  args: { ids: v.array(v.id("galleryImages")) },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const docs = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    const present = docs.filter((doc) => doc !== null);
    await deleteImages(ctx, present.map((doc) => doc.image));
    await Promise.all(present.map((doc) => ctx.db.delete(doc._id)));
  },
});

export const reorder = mutation({
  args: { ids: v.array(v.id("galleryImages")) },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await Promise.all(args.ids.map((id, index) => ctx.db.patch(id, { order: index })));
  },
});
