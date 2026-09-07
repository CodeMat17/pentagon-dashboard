import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { bookingStatus, notification, notificationKind } from "./schema";
import { requireViewer, requireEditor } from "./auth";
import {
  getPolicy,
  holdExpiresAt,
  holdUntilFor,
  hourInLagos,
  shiftDate,
  todayInLagos,
} from "./policy";
import { quoteStay } from "./pricing";
import { throttle } from "./limits";

/**
 * Reservations.
 *
 * The website creates them (public `create`), a guest opens theirs from the link
 * in their confirmation SMS (public `byPublicReference`) or looks it up to change
 * it (public `lookup`, `cancel`), and staff manage them (guarded).
 *
 * Two different reads, two different keys, on purpose:
 *
 * - `byPublicReference` takes the reference alone, because the reference *is*
 *   the credential — it only ever reaches the guest, inside the message sent to
 *   the phone number they gave us. It returns a redacted view: the stay, not the
 *   guest's contact details or the front desk's internal notes.
 * - `lookup` and `cancel` change things, so they want the reference *and* the
 *   email or phone on the booking — a shoulder-surfed link cannot cancel a stay.
 *
 * No card data is stored here. Nothing is paid online; a reservation is a held
 * room, settled at the hotel.
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

/** Ambiguity-free alphabet: no O/0, no I/1. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function reference() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return `PIHS-${out}`;
}

/**
 * Numbers reach us as `08033833628`, `+234 803 383 3628` or `234-803-383-3628`.
 * Comparing the last nine digits makes all three the same number without
 * pretending to be a phone-number parser.
 */
function phoneKey(value: string): string {
  return value.replace(/\D/g, "").slice(-9);
}

/** True when `contact` is the email or the phone number on the booking. */
function contactMatches(booking: Doc<"bookings">, contact: string): boolean {
  const given = contact.trim();
  if (!given) return false;
  if (booking.guest.email && booking.guest.email.toLowerCase() === given.toLowerCase()) {
    return true;
  }
  const key = phoneKey(given);
  return key.length >= 9 && phoneKey(booking.guest.phone) === key;
}

async function byRef(
  ctx: QueryCtx | MutationCtx,
  ref: string,
): Promise<Doc<"bookings"> | null> {
  const normalised = ref.trim().toUpperCase();
  if (!normalised) return null;
  return await ctx.db
    .query("bookings")
    .withIndex("by_reference", (q) => q.eq("reference", normalised))
    .unique();
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
    /**
     * The browser's estimate. Accepted so the website keeps working, then
     * ignored — `quoteStay` decides what the stay actually costs. Kept in the
     * signature rather than removed so a tab loaded before this change does not
     * fail on an unexpected argument.
     */
    total: v.number(),
  },
  returns: v.object({
    reference: v.string(),
    holdUntil: v.string(),
    /** The authoritative total, so the flow can show what was really booked. */
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique();
    if (settings && !settings.bookingsOpen) {
      throw new Error("Online booking is paused — please call the hotel to reserve.");
    }

    // A phone number is the one channel we must have: it is where the instant
    // confirmation goes, and how the desk reaches a guest who has not arrived.
    const phone = phoneKey(args.guest.phone);
    if (phone.length < 9) {
      throw new Error("A phone number we can reach you on is required.");
    }
    const email = args.guest.email.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error("That email address does not look right.");
    }

    /*
     * Nothing above this line has written anything, and nothing below it is
     * free: every reservation sends an email and a billed SMS. Keyed on the
     * phone, the one contact detail a booking cannot be made without, with a
     * global ceiling behind it for a script that changes number each time.
     */
    await throttle(
      ctx,
      "bookingPerGuest",
      phone,
      "That is a lot of reservations from one number in a short time.",
    );
    await throttle(
      ctx,
      "bookingGlobal",
      undefined,
      "We are taking an unusual number of reservations right now.",
    );

    /*
     * The price is decided here, not by the browser. A guest whose tab went
     * stale across a rate change is not turned away — their reservation stands,
     * quoted at the rates in force now, and it is that figure the confirmation
     * states. Nothing is paid online, so the total is the quote the desk will
     * settle against: it needs to be right, not to be defended.
     */
    const quote = await quoteStay(ctx, args);

    const policy = await getPolicy(ctx);
    const holdUntil = holdUntilFor(args.checkIn, policy.holdUntilTime);

    // Collisions are ~1 in 10^9; retrying twice makes them impossible in practice.
    let ref = reference();
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!(await byRef(ctx, ref))) break;
      ref = reference();
    }

    const id = await ctx.db.insert("bookings", {
      ...args,
      // Derived server-side too: `nights` is a pricing input, and the room's
      // name should read as it does today rather than as the tab remembers it.
      nights: quote.nights,
      roomName: quote.roomName,
      total: quote.total,
      guest: { ...args.guest, email },
      reference: ref,
      status: "confirmed",
      payment: "pay-at-hotel",
      holdUntil,
      notifications: [],
      remindersSent: [],
    });

    // The confirmation — email and SMS — goes out after this transaction
    // commits, so a slow or failing provider can never cost the guest their
    // reservation.
    await ctx.scheduler.runAfter(0, internal.notify.dispatch, {
      bookingId: id,
      kind: "confirmation",
    });

    return { reference: ref, holdUntil, total: quote.total };
  },
});

/**
 * The public reservation page, opened from the link in the guest's SMS.
 *
 * Redacted deliberately: enough to prove the booking and get the guest to the
 * door, nothing a stranger who guessed a reference could use against them.
 */
export const byPublicReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const booking = await byRef(ctx, args.reference);
    if (!booking) return null;
    const policy = await getPolicy(ctx);

    return {
      reference: booking.reference,
      status: booking.status,
      createdAt: booking._creationTime,
      roomSlug: booking.roomSlug,
      roomName: booking.roomName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      roomCount: booking.roomCount,
      extras: booking.extras,
      total: booking.total,
      payment: booking.payment ?? "pay-at-hotel",
      holdUntil: booking.holdUntil ?? holdUntilFor(booking.checkIn, policy.holdUntilTime),
      specialRequests: booking.guest.specialRequests,
      guestName: `${booking.guest.firstName} ${booking.guest.lastName}`.trim(),
      /** Enough for the guest to recognise their own booking, not to harvest it. */
      hasEmail: Boolean(booking.guest.email),
      policy: {
        checkIn: policy.checkIn,
        checkOut: policy.checkOut,
        cancellation: policy.cancellationPolicy,
        noShow: policy.noShowPolicy,
      },
    };
  },
});

/** Public. The reference *and* the email or phone on the booking must match. */
export const lookup = query({
  args: { reference: v.string(), contact: v.string() },
  handler: async (ctx, args) => {
    const booking = await byRef(ctx, args.reference);
    if (!booking || !contactMatches(booking, args.contact)) return null;
    const { note, ...safe } = booking;
    void note;
    return safe;
  },
});

/** Public. Same two-factor check as `lookup`. */
export const cancel = mutation({
  args: { reference: v.string(), contact: v.string() },
  handler: async (ctx, args) => {
    const booking = await byRef(ctx, args.reference);
    if (!booking || !contactMatches(booking, args.contact)) {
      throw new Error(
        "We could not find that booking. Check the reference and the email or phone you booked with.",
      );
    }
    if (booking.status === "cancelled") return booking._id;
    await ctx.db.patch(booking._id, { status: "cancelled" });
    await ctx.scheduler.runAfter(0, internal.notify.dispatch, {
      bookingId: booking._id,
      kind: "cancellation",
    });
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
    status: v.optional(bookingStatus),
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
 * Unlike the public `lookup`, this takes the reference alone — the second factor
 * is there to stop strangers guessing codes over the internet, and behind staff
 * auth it would only block the desk when the guest booked under someone else's
 * details.
 */
export const byReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    await requireViewer(ctx);
    return await byRef(ctx, args.reference);
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

/**
 * Today's holds, in the order they expire.
 *
 * This is the panel the duty manager works from: everyone due in today who has
 * not walked through the door yet, and how long the room stays theirs.
 */
export const arrivalsToday = query({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    await requireViewer(ctx);
    const policy = await getPolicy(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_checkIn", (q) => q.eq("checkIn", args.today))
      .take(200);

    return bookings
      .filter((booking) => booking.status === "confirmed" || booking.status === "pending")
      .map((booking) => ({
        _id: booking._id,
        reference: booking.reference,
        status: booking.status,
        guest: `${booking.guest.firstName} ${booking.guest.lastName}`.trim(),
        phone: booking.guest.phone,
        roomName: booking.roomName,
        roomCount: booking.roomCount,
        nights: booking.nights,
        total: booking.total,
        holdUntil: booking.holdUntil ?? holdUntilFor(booking.checkIn, policy.holdUntilTime),
      }))
      .sort((a, b) => a.holdUntil.localeCompare(b.holdUntil));
  },
});

export const setStatus = mutation({
  args: { id: v.id("bookings"), status: bookingStatus },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

/**
 * Extend (or shorten) a hold from the front desk.
 *
 * A guest who calls to say they are stuck in Port Harcourt traffic should not
 * lose their room to a cron job — that is the whole point of asking guests to
 * communicate, so the desk needs a way to honour it.
 */
export const setHoldUntil = mutation({
  args: { id: v.id("bookings"), holdUntil: v.string() },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(args.holdUntil)) {
      throw new Error("Hold time must look like 2026-09-15T20:00.");
    }
    await ctx.db.patch(args.id, { holdUntil: args.holdUntil });
  },
});

export const setNote = mutation({
  args: { id: v.id("bookings"), note: v.string() },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, { note: args.note });
  },
});

/** Send a guest their confirmation again, by hand, from the reservation row. */
export const resend = mutation({
  args: { id: v.id("bookings"), kind: notificationKind },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const booking = await ctx.db.get(args.id);
    if (!booking) throw new Error("That reservation no longer exists.");
    await ctx.scheduler.runAfter(0, internal.notify.dispatch, {
      bookingId: args.id,
      kind: args.kind,
      force: true,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("bookings") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});

/* ---------------------------------------------------------------- internal */

export const get = internalQuery({
  args: { id: v.id("bookings") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

/** Appends a delivery result and, for reminders, records that it went out. */
export const recordNotification = internalMutation({
  args: { id: v.id("bookings"), entry: notification },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking) return null;

    // Keep the tail: a reservation should not grow an unbounded delivery log.
    const notifications = [...(booking.notifications ?? []), args.entry].slice(-20);
    const remindersSent = new Set(booking.remindersSent ?? []);
    if (args.entry.status === "sent") remindersSent.add(args.entry.kind);

    await ctx.db.patch(args.id, { notifications, remindersSent: [...remindersSent] });
    return null;
  },
});

/**
 * Everyone due a reminder right now.
 *
 * `remindersSent` is the idempotency key rather than a timestamp comparison: the
 * cron can run late, run twice, or run again after a redeploy, and a guest still
 * gets exactly one "see you tomorrow".
 *
 * A reminder is also never sent on the day the booking was made. Someone who
 * books on Monday for Tuesday has already had the confirmation — the whole of it,
 * by email, minutes earlier — and a second message the same evening reads as a
 * system talking to itself rather than a hotel expecting them. A walk-in booking
 * for tonight gets the confirmation alone.
 */
export const dueReminders = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const policy = await getPolicy(ctx);
    if (!policy.remindersEnabled) return [];

    // Nobody wants a hotel's text at 02:00. The sweep runs every hour so
    // that expired holds are released promptly; the guest-facing messages wait
    // for a civilised hour — the evening before, and mid-morning on the day.
    const hour = hourInLagos(args.now);
    const sendDayBefore = hour >= 18;
    const sendArrival = hour >= 9;
    if (!sendDayBefore && !sendArrival) return [];

    const today = todayInLagos(args.now);
    const tomorrow = shiftDate(today, 1);

    const [arrivingToday, arrivingTomorrow] = await Promise.all([
      ctx.db
        .query("bookings")
        .withIndex("by_status_checkIn", (q) =>
          q.eq("status", "confirmed").eq("checkIn", today),
        )
        .take(200),
      ctx.db
        .query("bookings")
        .withIndex("by_status_checkIn", (q) =>
          q.eq("status", "confirmed").eq("checkIn", tomorrow),
        )
        .take(200),
    ]);

    /** Booked today? The confirmation is enough for one day. */
    const bookedToday = (booking: Doc<"bookings">) =>
      todayInLagos(booking._creationTime) === today;

    const due: { bookingId: Id<"bookings">; kind: string }[] = [];
    if (sendDayBefore) {
      for (const booking of arrivingTomorrow) {
        if (bookedToday(booking)) continue;
        if (!(booking.remindersSent ?? []).includes("reminder-day-before")) {
          due.push({ bookingId: booking._id, kind: "reminder-day-before" });
        }
      }
    }
    if (sendArrival) {
      for (const booking of arrivingToday) {
        if (bookedToday(booking)) continue;
        if (!(booking.remindersSent ?? []).includes("reminder-arrival")) {
          due.push({ bookingId: booking._id, kind: "reminder-arrival" });
        }
      }
    }
    return due;
  },
});

/**
 * Releases rooms whose hold has expired.
 *
 * Only `confirmed` reservations on a past-or-present arrival date are eligible,
 * and only once their `holdUntil` instant has passed — a guest who checked in,
 * cancelled, or had their hold extended by the desk is never touched.
 */
export const releaseExpiredHolds = internalMutation({
  args: { now: v.number() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const policy = await getPolicy(ctx);
    const today = todayInLagos(args.now);
    const candidates = await ctx.db
      .query("bookings")
      .withIndex("by_status_checkIn", (q) =>
        q.eq("status", "confirmed").lte("checkIn", today),
      )
      .take(200);

    const released: string[] = [];
    for (const booking of candidates) {
      const holdUntil =
        booking.holdUntil ?? holdUntilFor(booking.checkIn, policy.holdUntilTime);
      if (holdExpiresAt(holdUntil) > args.now) continue;
      await ctx.db.patch(booking._id, { status: "no-show" });
      released.push(booking.reference);
    }
    return released;
  },
});
