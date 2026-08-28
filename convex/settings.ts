import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

/**
 * A single row, keyed `"site"` — the contact details, tax rates and kill switches
 * the website reads on every page. One indexed lookup, cached by the site's ISR.
 */

const fields = {
  phone: v.string(),
  whatsapp: v.string(),
  email: v.string(),
  reservationsEmail: v.string(),
  address: v.string(),
  checkIn: v.string(),
  checkOut: v.string(),
  vatRate: v.number(),
  serviceRate: v.number(),
  announcement: v.string(),
  announcementActive: v.boolean(),
  bookingsOpen: v.boolean(),
};

export const get = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique(),
});

/** Upsert — the row is created on first save rather than by a migration. */
export const save = mutation({
  args: fields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.vatRate < 0 || args.vatRate > 1 || args.serviceRate < 0 || args.serviceRate > 1) {
      throw new Error("Tax rates are fractions between 0 and 1 (0.075 = 7.5%).");
    }
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("settings", { key: "site", ...args });
  },
});
