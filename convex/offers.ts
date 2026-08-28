import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { image } from "./schema";
import { requireEditor } from "./auth";
import { deleteImages } from "./files";

const fields = {
  slug: v.string(),
  title: v.string(),
  blurb: v.string(),
  description: v.string(),
  validity: v.string(),
  inclusions: v.array(v.string()),
  terms: v.string(),
  discountLabel: v.string(),
  fromRate: v.number(),
  image,
  code: v.string(),
  order: v.number(),
  published: v.boolean(),
};

/** Public. */
export const list = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("offers")
      .withIndex("by_published_order", (q) => q.eq("published", true))
      .collect(),
});

/** Dashboard. */
export const all = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("offers").withIndex("by_slug").collect(),
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const clash = await ctx.db
      .query("offers")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (clash) throw new Error(`An offer already uses the slug "${args.slug}".`);
    return await ctx.db.insert("offers", { ...args, code: args.code.toUpperCase() });
  },
});

export const update = mutation({
  args: { id: v.id("offers"), ...fields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("That offer no longer exists.");
    if (existing.image.storageId !== patch.image.storageId) {
      await deleteImages(ctx, [existing.image]);
    }
    await ctx.db.patch(id, { ...patch, code: patch.code.toUpperCase() });
  },
});

export const setPublished = mutation({
  args: { id: v.id("offers"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, { published: args.published });
  },
});

export const remove = mutation({
  args: { id: v.id("offers") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const offer = await ctx.db.get(args.id);
    if (!offer) return;
    await deleteImages(ctx, [offer.image]);
    await ctx.db.delete(args.id);
  },
});
