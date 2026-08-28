import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireEditor } from "./auth";

/**
 * Facilities are edited as whole groups — a category, its blurb and its items —
 * because that is how /facilities renders them. Nesting the items keeps the read
 * to a single index scan instead of a join per category.
 */

const item = v.object({
  name: v.string(),
  description: v.string(),
  icon: v.string(),
  hours: v.optional(v.string()),
});

const fields = {
  category: v.string(),
  blurb: v.string(),
  items: v.array(item),
  order: v.number(),
};

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("facilityGroups").withIndex("by_order").collect(),
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    return await ctx.db.insert("facilityGroups", args);
  },
});

export const update = mutation({
  args: { id: v.id("facilityGroups"), ...fields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("facilityGroups") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});
