import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireEditor } from "./auth";

const fields = {
  category: v.string(),
  question: v.string(),
  answer: v.string(),
  order: v.number(),
  published: v.boolean(),
};

/** Public. */
export const list = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("faqs")
      .withIndex("by_published_order", (q) => q.eq("published", true))
      .collect(),
});

/** Dashboard. */
export const all = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("faqs").withIndex("by_category").collect(),
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    return await ctx.db.insert("faqs", args);
  },
});

export const update = mutation({
  args: { id: v.id("faqs"), ...fields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("faqs") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: { ids: v.array(v.id("faqs")) },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await Promise.all(args.ids.map((id, index) => ctx.db.patch(id, { order: index })));
  },
});
