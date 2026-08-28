import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireEditor } from "./auth";

/**
 * Two flat, small lists that the site renders as tables: the guest-services A–Z
 * and the "what is nearby" table on /location. They share a module because they
 * share a shape and an editor screen.
 */

/* ------------------------------------------------------------- services */

const serviceFields = {
  name: v.string(),
  description: v.string(),
  icon: v.string(),
  availability: v.string(),
  order: v.number(),
};

export const services = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("guestServices").withIndex("by_order").collect(),
});

export const createService = mutation({
  args: serviceFields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    return await ctx.db.insert("guestServices", args);
  },
});

export const updateService = mutation({
  args: { id: v.id("guestServices"), ...serviceFields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    await ctx.db.patch(id, patch);
  },
});

export const removeService = mutation({
  args: { id: v.id("guestServices") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});

/* ---------------------------------------------------------- attractions */

const attractionFields = {
  name: v.string(),
  category: v.string(),
  distanceKm: v.number(),
  minutes: v.number(),
  note: v.string(),
  order: v.number(),
};

export const attractions = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("attractions").withIndex("by_order").collect(),
});

export const createAttraction = mutation({
  args: attractionFields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    return await ctx.db.insert("attractions", args);
  },
});

export const updateAttraction = mutation({
  args: { id: v.id("attractions"), ...attractionFields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    await ctx.db.patch(id, patch);
  },
});

export const removeAttraction = mutation({
  args: { id: v.id("attractions") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});
