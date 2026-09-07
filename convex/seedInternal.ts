import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { DataModel, TableNames } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { DEFAULTS } from "./policy";

/**
 * Database half of `seed.ts`.
 *
 * The action there runs in Node (it downloads images); these run in the Convex
 * runtime with database access. Arguments are `v.any()` because the shapes are
 * exactly the table shapes — the schema validates them on insert, so a bad seed
 * fails loudly rather than writing half a table.
 */

export const assertAdmin = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return null;
  },
});

/** Content tables only — guest data and staff are never wiped. */
const CONTENT_TABLES = [
  "rooms",
  "facilityGroups",
  "diningVenues",
  "venues",
  "offers",
  "extraServices",
  "promoCodes",
  "reviews",
  "attractions",
  "guestServices",
  "faqs",
  "galleryImages",
  "posts",
] as const satisfies readonly TableNames[];

type ContentTable = (typeof CONTENT_TABLES)[number];

async function wipe(ctx: MutationCtx, table: ContentTable) {
  const docs = await ctx.db.query(table).collect();
  for (const doc of docs) {
    // Storage files go with the rows that referenced them.
    const record = doc as Record<string, unknown>;
    const single = record.image as { storageId?: string } | undefined;
    const many = record.images as { storageId?: string }[] | undefined;
    const ids = [
      ...(single?.storageId ? [single.storageId] : []),
      ...(many ?? []).flatMap((img) => (img.storageId ? [img.storageId] : [])),
    ];
    for (const id of ids) {
      await ctx.storage.delete(id as never).catch(() => undefined);
    }
    await ctx.db.delete(doc._id);
  }
}

export const replaceAll = internalMutation({
  args: {
    rooms: v.array(v.any()),
    facilityGroups: v.array(v.any()),
    diningVenues: v.array(v.any()),
    venues: v.array(v.any()),
    offers: v.array(v.any()),
    extraServices: v.array(v.any()),
    promoCodes: v.array(v.any()),
    reviews: v.array(v.any()),
    attractions: v.array(v.any()),
    guestServices: v.array(v.any()),
    faqs: v.array(v.any()),
    galleryImages: v.array(v.any()),
    posts: v.array(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // No guard here on purpose: an internal mutation is unreachable from any
    // client, and its two callers are `seed:run` (admin-checked) and
    // `seed:fromCli` (reachable only with deploy credentials).
    for (const table of CONTENT_TABLES) {
      await wipe(ctx, table);
      const rows = args[table] as DataModel[ContentTable]["document"][];
      for (const row of rows) {
        await ctx.db.insert(table, row as never);
      }
    }

    // Settings is upserted, not wiped — an admin may have already tuned it.
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique();
    if (!settings) {
      await ctx.db.insert("settings", {
        key: "site",
        phone: "08033833628",
        whatsapp: "2348033833628",
        email: "info@pentagoninternationalhotel.com",
        reservationsEmail: "reservations@pentagoninternationalhotel.com",
        address:
          "1 Solomon Wali Street, Owhipa Choba, Port Harcourt, Rivers State, Nigeria",
        checkIn: "14:00",
        checkOut: "12:00",
        vatRate: 0.075,
        serviceRate: 0.05,
        announcement: "",
        announcementActive: false,
        bookingsOpen: true,
        holdUntilTime: DEFAULTS.holdUntilTime,
        cancellationPolicy: DEFAULTS.cancellationPolicy,
        noShowPolicy: DEFAULTS.noShowPolicy,
        remindersEnabled: true,
        smsEnabled: true,
      });
    }

    return null;
  },
});
