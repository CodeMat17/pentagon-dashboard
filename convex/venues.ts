import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { image } from "./schema";
import { requireEditor } from "./auth";
import { deleteImages } from "./files";

/** Event spaces — the conference halls and terraces sold on /events. */

const fields = {
  slug: v.string(),
  name: v.string(),
  blurb: v.string(),
  description: v.string(),
  areaSqm: v.number(),
  dimensions: v.string(),
  capacities: v.array(v.object({ layout: v.string(), seats: v.number() })),
  equipment: v.array(v.string()),
  image,
  fromRate: v.number(),
  order: v.number(),
};

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("venues").withIndex("by_order").collect(),
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const clash = await ctx.db
      .query("venues")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (clash) throw new Error(`A space already uses the slug "${args.slug}".`);
    return await ctx.db.insert("venues", args);
  },
});

export const update = mutation({
  args: { id: v.id("venues"), ...fields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("That space no longer exists.");
    if (existing.image.storageId !== patch.image.storageId) {
      await deleteImages(ctx, [existing.image]);
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("venues") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const venue = await ctx.db.get(args.id);
    if (!venue) return;
    await deleteImages(ctx, [venue.image]);
    await ctx.db.delete(args.id);
  },
});
