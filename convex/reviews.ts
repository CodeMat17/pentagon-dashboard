import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireEditor } from "./auth";

const fields = {
  author: v.string(),
  rating: v.number(),
  date: v.string(),
  source: v.string(),
  title: v.string(),
  body: v.string(),
  stayType: v.string(),
  published: v.boolean(),
  order: v.number(),
};

/**
 * Public. Returns the published reviews *and* the aggregate the site puts in its
 * `LodgingBusiness` JSON-LD, computed here so the page never has to reduce over
 * the list twice — once for display and once for schema.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_published_order", (q) => q.eq("published", true))
      .collect();

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return {
      reviews,
      summary: {
        value: reviews.length ? Math.round((total / reviews.length) * 10) / 10 : 0,
        count: reviews.length,
        best: 5,
      },
    };
  },
});

/** Dashboard. */
export const all = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("reviews").withIndex("by_published_order").collect(),
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    if (args.rating < 1 || args.rating > 5) throw new Error("Rating must be 1–5.");
    return await ctx.db.insert("reviews", args);
  },
});

export const update = mutation({
  args: { id: v.id("reviews"), ...fields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    if (patch.rating < 1 || patch.rating > 5) throw new Error("Rating must be 1–5.");
    await ctx.db.patch(id, patch);
  },
});

export const setPublished = mutation({
  args: { id: v.id("reviews"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, { published: args.published });
  },
});

export const remove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});
