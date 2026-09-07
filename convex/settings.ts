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

  /*
   * Reservation and no-show policy. Optional so that the row as it existed
   * before these fields, and a save from a client that predates them, both
   * still validate — `convex/policy.ts` supplies the defaults on read.
   */
  holdUntilTime: v.optional(v.string()),
  cancellationPolicy: v.optional(v.string()),
  noShowPolicy: v.optional(v.string()),
  remindersEnabled: v.optional(v.boolean()),
  smsEnabled: v.optional(v.boolean()),
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
    if (args.holdUntilTime && !/^\d{2}:\d{2}$/.test(args.holdUntilTime)) {
      throw new Error("The hold-until time must be a 24-hour clock time, like 20:00.");
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
