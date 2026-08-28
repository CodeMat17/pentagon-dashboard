import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { image } from "./schema";
import { requireEditor } from "./auth";
import { deleteImages } from "./files";

const fields = {
  slug: v.string(),
  name: v.string(),
  cuisine: v.string(),
  blurb: v.string(),
  description: v.string(),
  hours: v.string(),
  dressCode: v.string(),
  capacity: v.number(),
  image,
  highlights: v.array(
    v.object({ name: v.string(), description: v.string(), price: v.number() }),
  ),
  order: v.number(),
};

/** Public and dashboard alike — the dining page shows every venue. */
export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("diningVenues").withIndex("by_order").collect(),
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const clash = await ctx.db
      .query("diningVenues")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (clash) throw new Error(`A venue already uses the slug "${args.slug}".`);
    return await ctx.db.insert("diningVenues", args);
  },
});

export const update = mutation({
  args: { id: v.id("diningVenues"), ...fields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("That venue no longer exists.");
    if (existing.image.storageId !== patch.image.storageId) {
      await deleteImages(ctx, [existing.image]);
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("diningVenues") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const venue = await ctx.db.get(args.id);
    if (!venue) return;
    await deleteImages(ctx, [venue.image]);
    await ctx.db.delete(args.id);
  },
});
