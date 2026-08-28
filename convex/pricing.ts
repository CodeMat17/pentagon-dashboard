import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin, requireEditor } from "./auth";

/**
 * The two levers that change what a guest pays: bookable extras, and promo codes.
 *
 * `validatePromo` is deliberately the only way the website learns a discount —
 * the codes themselves are never shipped to the browser, so an inactive or
 * mistyped code fails server-side rather than being guessable from the bundle.
 */

/* ----------------------------------------------------------------- extras */

const extraFields = {
  key: v.string(),
  name: v.string(),
  description: v.string(),
  price: v.number(),
  unit: v.union(v.literal("stay"), v.literal("night")),
  icon: v.string(),
  order: v.number(),
  active: v.boolean(),
};

/** Public. Only the extras a guest can actually add. */
export const extras = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("extraServices")
      .withIndex("by_active_order", (q) => q.eq("active", true))
      .collect(),
});

/** Dashboard. */
export const allExtras = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("extraServices").withIndex("by_key").collect(),
});

export const createExtra = mutation({
  args: extraFields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const clash = await ctx.db
      .query("extraServices")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (clash) throw new Error(`An extra already uses the key "${args.key}".`);
    return await ctx.db.insert("extraServices", args);
  },
});

export const updateExtra = mutation({
  args: { id: v.id("extraServices"), ...extraFields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    await ctx.db.patch(id, patch);
  },
});

export const removeExtra = mutation({
  args: { id: v.id("extraServices") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});

/* ------------------------------------------------------------ promo codes */

/** Public. Validates one code; returns nothing useful for a wrong guess. */
export const validatePromo = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({ valid: v.literal(true), discount: v.number(), label: v.string() }),
    v.object({ valid: v.literal(false) }),
  ),
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    if (!code) return { valid: false as const };
    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!promo || !promo.active) return { valid: false as const };
    return { valid: true as const, discount: promo.discount, label: promo.label };
  },
});

/** Dashboard only — the full list never reaches the public site. */
export const allPromos = query({
  args: {},
  handler: async (ctx) => {
    await requireEditor(ctx);
    return await ctx.db.query("promoCodes").withIndex("by_code").collect();
  },
});

export const createPromo = mutation({
  args: {
    code: v.string(),
    discount: v.number(),
    label: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const code = args.code.trim().toUpperCase();
    if (args.discount <= 0 || args.discount >= 1) {
      throw new Error("Discount must be between 0 and 1 (0.15 = 15% off).");
    }
    const clash = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (clash) throw new Error(`The code ${code} already exists.`);
    return await ctx.db.insert("promoCodes", { ...args, code });
  },
});

export const updatePromo = mutation({
  args: {
    id: v.id("promoCodes"),
    code: v.string(),
    discount: v.number(),
    label: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    if (patch.discount <= 0 || patch.discount >= 1) {
      throw new Error("Discount must be between 0 and 1 (0.15 = 15% off).");
    }
    await ctx.db.patch(id, { ...patch, code: patch.code.trim().toUpperCase() });
  },
});

export const removePromo = mutation({
  args: { id: v.id("promoCodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
