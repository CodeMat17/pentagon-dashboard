import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireViewer, requireEditor } from "./auth";

/**
 * Reservations.
 *
 * The website creates them (public `create`), guests look them up by reference
 * *and* email (public `lookup`, `cancel`), and staff manage them (guarded).
 * A booking is never listed publicly — the only public read is an exact
 * reference + email match, so a reference alone leaks nothing.
 *
 * No card data is stored here, by design.
 */

const guest = v.object({
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.string(),
  country: v.string(),
  specialRequests: v.string(),
  arrivalTime: v.string(),
});

const status = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("checked-in"),
  v.literal("completed"),
  v.literal("cancelled"),
);

/** Ambiguity-free alphabet: no O/0, no I/1. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function reference() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return `PHS-${out}`;
}

/* ------------------------------------------------------------------ public */

export const create = mutation({
  args: {
    roomSlug: v.string(),
    roomName: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
    nights: v.number(),
    adults: v.number(),
    children: v.number(),
    roomCount: v.number(),
    extras: v.array(v.string()),
    promoCode: v.union(v.string(), v.null()),
    guest,
    total: v.number(),
  },
  returns: v.object({ reference: v.string() }),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique();
    if (settings && !settings.bookingsOpen) {
      throw new Error("Online booking is paused — please call the hotel to reserve.");
    }

    // Collisions are ~1 in 10^9; retrying twice makes them impossible in practice.
    let ref = reference();
    for (let attempt = 0; attempt < 3; attempt++) {
      const taken = await ctx.db
        .query("bookings")
        .withIndex("by_reference", (q) => q.eq("reference", ref))
        .unique();
      if (!taken) break;
      ref = reference();
    }

    await ctx.db.insert("bookings", { ...args, reference: ref, status: "confirmed" });
    return { reference: ref };
  },
});

/** Public. Reference *and* email must both match. */
export const lookup = query({
  args: { reference: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference.trim().toUpperCase()))
      .unique();
    if (!booking) return null;
    if (booking.guest.email.toLowerCase() !== args.email.trim().toLowerCase()) return null;
    return booking;
  },
});

/** Public. Same two-factor check as `lookup`. */
export const cancel = mutation({
  args: { reference: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference.trim().toUpperCase()))
      .unique();
    if (!booking || booking.guest.email.toLowerCase() !== args.email.trim().toLowerCase()) {
      throw new Error("We could not find that booking. Check the reference and email.");
    }
    if (booking.status === "cancelled") return booking._id;
    await ctx.db.patch(booking._id, { status: "cancelled" });
    return booking._id;
  },
});

/* --------------------------------------------------------------- dashboard */

/**
 * Paged, newest first. Reservations accumulate forever, so this never collects
 * the whole table — the list screen asks for a page at a time.
 */
export const page = query({
  args: {
    status: v.optional(status),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireViewer(ctx);
    const q = args.status
      ? ctx.db.query("bookings").withIndex("by_status", (i) => i.eq("status", args.status!))
      : ctx.db.query("bookings");
    return await q.order("desc").paginate(args.paginationOpts);
  },
});

/**
 * The front-desk lookup: a guest arrives holding only their reference code.
 *
 * Unlike the public `lookup`, this takes the reference alone — the email
 * second factor is there to stop strangers guessing codes over the internet,
 * and behind staff auth it would only block the desk when the guest booked
 * under someone else's address.
 */
export const byReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    await requireViewer(ctx);
    const ref = args.reference.trim().toUpperCase();
    if (!ref) return null;
    return await ctx.db
      .query("bookings")
      .withIndex("by_reference", (q) => q.eq("reference", ref))
      .unique();
  },
});

/** The arrivals board: everyone checking in on or after `from`, soonest first. */
export const upcoming = query({
  args: { from: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireViewer(ctx);
    return await ctx.db
      .query("bookings")
      .withIndex("by_checkIn", (q) => q.gte("checkIn", args.from))
      .order("asc")
      .take(args.limit ?? 8);
  },
});

export const setStatus = mutation({
  args: { id: v.id("bookings"), status },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const setNote = mutation({
  args: { id: v.id("bookings"), note: v.string() },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, { note: args.note });
  },
});

export const remove = mutation({
  args: { id: v.id("bookings") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});
