import { Robase, isRobaseError } from "@robasedev/sdk";
import { v } from "convex/values";
import type { GenericActionCtx } from "convex/server";

import { internal } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";
import { notificationKind } from "./schema";
import { getPolicy, type Policy } from "./policy";

/**
 * Guest notifications: one reservation, two channels, different jobs.
 *
 * **Email (Resend)** carries the whole thing — dates, room, guests, the price
 * breakdown, the policies. It is the official record of the booking, the thing a
 * guest forwards to their employer or shows at the desk. It is also the cheap
 * channel, so it carries every message: the confirmation, the nudge the evening
 * before arrival, the welcome on the morning itself, and cancellations.
 *
 * **SMS (Robase)** carries one line: the reference, the arrival date and a link.
 * It is the *receipt*, not the document — and it is billed per message, so it
 * goes out on confirmation and cancellation only, never for a reminder.
 * Everything else lives one tap away on the reservation page, where it can be
 * laid out properly and stays current after the booking changes.
 *
 * Neither channel can fail the booking. Every send is a scheduled action running
 * after the reservation has already committed, every failure is caught, and the
 * outcome is written back onto the booking so the front desk can see what the
 * guest did and did not receive.
 *
 * Configure on the Convex deployment, not in `.env.local`:
 *
 *   npx convex env set RESEND_API_KEY re_...
 *   npx convex env set RESEND_FROM "Pentagon International Hotel and Suites <info@pentagoninternationalhotel.com>"
 *   npx convex env set SITE_URL https://pentagoninternationalhotel.com
 *   npx convex env set ROBASE_API_KEY robe_...
 */

const SITE_URL_FALLBACK = "https://pentagoninternationalhotel.com";
const HOTEL = "Pentagon International Hotel and Suites";
/** The name an SMS opens with — short, because a GSM segment is 160 characters. */
const SMS_SENDER = "Pentagon Intl Hotel";
/** One billed message, in GSM-7 characters. Past this, a send costs two. */
const GSM_SEGMENT = 160;

type Kind =
  | "confirmation"
  | "reminder-day-before"
  | "reminder-arrival"
  | "cancellation";

/**
 * The only kinds that ever go out by SMS.
 *
 * Robase bills per message and email does not, so the guest gets one SMS when
 * the booking is confirmed — the moment they most want the reassurance — and
 * one if it is cancelled, which they need to know without opening an inbox.
 * Both reminders are email alone.
 */
const SMS_KINDS = new Set<Kind>(["confirmation", "cancellation"]);

/* ------------------------------------------------------------- formatting */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** `2026-09-15` → `15 September 2026`, without touching the host time zone. */
function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** `2026-09-15` → `15 Sep`, for the one line an SMS has room for. */
function shortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1].slice(0, 3)}`;
}

/**
 * `20:00` → `8pm`, `14:30` → `2:30pm`, `12:00` → `12 noon`.
 *
 * Settings stores these as 24-hour `HH:MM` — that is what a time input produces
 * and what the hold arithmetic parses. Guests do not read clocks that way, so
 * every time on its way to a guest passes through here: the stored value stays
 * canonical, only the reading changes.
 *
 * Anything that is not `HH:MM` is passed through untouched, so staff who type
 * "2 PM" or "noon" into settings get back exactly what they typed.
 */
function clock12(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return time;
  if (minute === 0 && hour === 12) return "12 noon";
  if (minute === 0 && hour === 0) return "midnight";
  const suffix = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0
    ? `${h12}${suffix}`
    : `${h12}:${String(minute).padStart(2, "0")}${suffix}`;
}

/** `2026-09-15T20:00` → `8pm on 15 September 2026`. */
function longHold(holdUntil: string): string {
  const [date, time] = holdUntil.split("T");
  return `${clock12(time)} on ${longDate(date)}`;
}

function naira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function guestCount(adults: number, children: number): string {
  const parts = [`${adults} adult${adults === 1 ? "" : "s"}`];
  if (children) parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  return parts.join(", ");
}

/**
 * Robase wants E.164. Nigerian guests type `08033833628`, so a leading zero is
 * swapped for the country code; anything already international keeps its digits
 * and loses its punctuation.
 */
function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length <= 11) return `+234${digits}`;
  return `+${digits}`;
}

/** HTML-escapes guest-supplied text before it goes into an email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------- the context */

interface NotifyContext {
  booking: Doc<"bookings">;
  policy: Policy;
  settings: {
    phone: string;
    whatsapp: string;
    email: string;
    reservationsEmail: string;
    address: string;
  };
}

/**
 * One read for everything a message needs.
 *
 * Actions have no database, and three round trips for a booking, the policy and
 * the hotel's address would be three chances to catch the data mid-edit.
 */
export const context = internalQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;
    const policy = await getPolicy(ctx);
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique();

    return {
      booking,
      policy,
      settings: {
        phone: settings?.phone || "08033833628",
        whatsapp: settings?.whatsapp || "2348033833628",
        email: settings?.email || "info@pentagoninternationalhotel.com",
        reservationsEmail:
          settings?.reservationsEmail ||
          "reservations@pentagoninternationalhotel.com",
        address:
          settings?.address ||
          "1 Solomon Wali Street, Owhipa Choba, Port Harcourt, Rivers State, Nigeria",
      },
    } satisfies NotifyContext;
  },
});

/* ----------------------------------------------------------------- content */

function reservationUrl(reference: string): string {
  const base = (process.env.SITE_URL || SITE_URL_FALLBACK).replace(/\/$/, "");
  return `${base}/reservation/${reference}`;
}

/**
 * The SMS. One sentence and a link, because every character is billed and the
 * reservation page says the rest.
 */
function smsBody(kind: Kind, ctx: NotifyContext): string {
  const { booking } = ctx;
  const link = reservationUrl(booking.reference);

  const body =
    kind === "cancellation"
      ? `${SMS_SENDER}: Reservation ${booking.reference} for ${shortDate(booking.checkIn)} has been cancelled. Nothing is owed. ${link}`
      : `${SMS_SENDER}: Your reservation ${booking.reference} is confirmed for ${shortDate(booking.checkIn)}. View reservation: ${link}`;

  // Both bodies are written to land inside one 160-character GSM segment, which
  // is the unit Robase bills. A reference is a fixed 11 characters and the copy
  // is plain ASCII, so the only thing that can push a message over is a longer
  // SITE_URL. Say so in the logs rather than quietly billing twice.
  if (body.length > GSM_SEGMENT) {
    console.warn(
      `[notify] sms ${kind} for ${booking.reference} is ${body.length} characters — past one ${GSM_SEGMENT}-character segment, so it bills as two.`,
    );
  }
  return body;
}

const SUBJECTS: Record<Kind, (booking: Doc<"bookings">) => string> = {
  confirmation: (b) => `Reservation confirmed — ${b.reference} · ${HOTEL}`,
  "reminder-day-before": (b) => `See you tomorrow — ${b.reference} · ${HOTEL}`,
  "reminder-arrival": (b) => `Welcome today — ${b.reference} · ${HOTEL}`,
  cancellation: (b) => `Reservation cancelled — ${b.reference} · ${HOTEL}`,
};

const INTROS: Record<Kind, (ctx: NotifyContext) => string> = {
  confirmation: () =>
    "Your reservation has been received and your room is allocated. No payment is required now — you settle at the hotel. This email is your booking document; keep it, or open your reservation page any time.",
  "reminder-day-before": () =>
    `Your stay at ${HOTEL} is coming up tomorrow. We look forward to welcoming you. Nothing to do in advance — just arrive, and we will take it from there.`,
  "reminder-arrival": (ctx) =>
    `Welcome to ${HOTEL}. Your room is ready for your arrival today, from ${clock12(ctx.policy.checkIn)}.`,
  cancellation: () =>
    "This reservation has been cancelled and the room released. Nothing is owed. We would be glad to welcome you another time.",
};

/**
 * The email. Table-based and inline-styled, because that is what survives
 * Gmail, Outlook and the assortment of Android mail clients Nigerian guests
 * actually read on — no external stylesheet, no web font, no image.
 */
function emailHtml(kind: Kind, ctx: NotifyContext): string {
  const { booking, policy, settings } = ctx;
  const link = reservationUrl(booking.reference);
  const holdUntil = booking.holdUntil ?? `${booking.checkIn}T${policy.holdUntilTime}`;
  const cancelled = kind === "cancellation";

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #ece7de;font:600 12px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8a8175;width:42%;vertical-align:top">${label}</td>
      <td style="padding:12px 0;border-bottom:1px solid #ece7de;font:600 15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1a17">${value}</td>
    </tr>`;

  const rows = [
    row("Booking reference", escapeHtml(booking.reference)),
    row("Guest", escapeHtml(`${booking.guest.firstName} ${booking.guest.lastName}`.trim())),
    row(
      "Room",
      `${escapeHtml(booking.roomName)}${booking.roomCount > 1 ? ` &times; ${booking.roomCount}` : ""}`,
    ),
    row("Check-in", `${longDate(booking.checkIn)}, from ${escapeHtml(clock12(policy.checkIn))}`),
    row("Check-out", `${longDate(booking.checkOut)}, by ${escapeHtml(clock12(policy.checkOut))}`),
    row("Nights", String(booking.nights)),
    row("Guests", guestCount(booking.adults, booking.children)),
    row("Payment", cancelled ? "Cancelled — nothing due" : "Pay at hotel on arrival"),
    row(
      "Estimated total",
      `${naira(booking.total)}<div style="font:400 13px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#8a8175;margin-top:2px">All taxes and service charge included.</div>`,
    ),
    booking.guest.specialRequests
      ? row("Special requests", escapeHtml(booking.guest.specialRequests))
      : "",
  ].join("");

  const policyBlock = cancelled
    ? ""
    : `
      <div style="background:#faf7f2;border-radius:14px;padding:20px;margin:28px 0">
        <p style="font:800 15px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1a17;margin:0 0 10px">Holding your room</p>
        <p style="font:400 14px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4a453e;margin:0 0 12px">
          No payment is required to make this reservation. Your room is held until
          <strong>${longHold(holdUntil)}</strong>. If you have not arrived or contacted us by then,
          the reservation is released and the room is offered to other guests.
        </p>
        <p style="font:400 14px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4a453e;margin:0 0 12px">
          <strong>Arriving late?</strong> Call or WhatsApp ${escapeHtml(settings.phone)} and we will hold the room for you.
        </p>
        <p style="font:400 14px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4a453e;margin:0">
          <strong>Cancellation.</strong> ${escapeHtml(policy.cancellationPolicy)}
        </p>
      </div>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(SUBJECTS[kind](booking))}</title></head>
<body style="margin:0;padding:0;background:#f4f1ea">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(booking.reference)} &middot; ${longDate(booking.checkIn)} &middot; pay at hotel</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
        <tr><td style="background:#1c1a17;padding:28px 32px">
          <p style="margin:0;font:800 13px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#c9a227">${HOTEL}</p>
          <p style="margin:8px 0 0;font:800 26px/1.25 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff">${cancelled ? "Reservation cancelled" : kind === "confirmation" ? "Reservation confirmed" : "Your upcoming stay"}</p>
        </td></tr>

        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font:400 16px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1a17">Dear ${escapeHtml(booking.guest.firstName || "guest")},</p>
          <p style="margin:0;font:400 15px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4a453e">${INTROS[kind](ctx)}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">${rows}</table>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
            <tr><td style="background:#c9a227;border-radius:999px">
              <a href="${link}" style="display:inline-block;padding:14px 28px;font:800 15px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1a17;text-decoration:none">View your reservation</a>
            </td></tr>
          </table>

          ${policyBlock}

          <p style="margin:0 0 6px;font:800 15px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1a17">Getting to us</p>
          <p style="margin:0 0 4px;font:400 14px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4a453e">${escapeHtml(settings.address)}</p>
          <p style="margin:0;font:400 14px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4a453e">
            ${escapeHtml(settings.phone)} &middot; <a href="mailto:${escapeHtml(settings.reservationsEmail)}" style="color:#8a6f14">${escapeHtml(settings.reservationsEmail)}</a>
          </p>
        </td></tr>

        <tr><td style="background:#faf7f2;padding:20px 32px">
          <p style="margin:0;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#8a8175">
            You are receiving this because a reservation was made in your name at ${HOTEL}.
            Reception answers 24 hours a day on ${escapeHtml(settings.phone)}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** The plain-text alternative — spam filters and text-only clients both want it. */
function emailText(kind: Kind, ctx: NotifyContext): string {
  const { booking, policy, settings } = ctx;
  const holdUntil = booking.holdUntil ?? `${booking.checkIn}T${policy.holdUntilTime}`;
  return [
    HOTEL.toUpperCase(),
    "",
    INTROS[kind](ctx),
    "",
    `Booking reference: ${booking.reference}`,
    `Guest: ${`${booking.guest.firstName} ${booking.guest.lastName}`.trim()}`,
    `Room: ${booking.roomName}${booking.roomCount > 1 ? ` x ${booking.roomCount}` : ""}`,
    `Check-in: ${longDate(booking.checkIn)} from ${clock12(policy.checkIn)}`,
    `Check-out: ${longDate(booking.checkOut)} by ${clock12(policy.checkOut)}`,
    `Guests: ${guestCount(booking.adults, booking.children)}`,
    `Payment: ${kind === "cancellation" ? "Cancelled — nothing due" : "Pay at hotel"}`,
    `Estimated total: ${naira(booking.total)} (taxes and service charge included)`,
    "",
    `View your reservation: ${reservationUrl(booking.reference)}`,
    "",
    kind === "cancellation"
      ? ""
      : `Your room is held until ${longHold(holdUntil)}. If you have not arrived or contacted us by then, the reservation is released. Running late? Call ${settings.phone}.`,
    "",
    settings.address,
    `${settings.phone} · ${settings.reservationsEmail}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/* ---------------------------------------------------------------- delivery */

interface Result {
  status: "sent" | "failed" | "skipped";
  detail: string;
}

/** Resend's REST API directly — one POST, no SDK to keep in step. */
async function sendEmail(kind: Kind, ctx: NotifyContext): Promise<Result> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: "skipped", detail: "RESEND_API_KEY is not set" };

  const to = ctx.booking.guest.email;
  if (!to) return { status: "skipped", detail: "No email address on the booking" };

  const from =
    process.env.RESEND_FROM || `${HOTEL} <info@pentagoninternationalhotel.com>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: ctx.settings.reservationsEmail,
        subject: SUBJECTS[kind](ctx.booking),
        html: emailHtml(kind, ctx),
        text: emailText(kind, ctx),
        tags: [{ name: "kind", value: kind }],
      }),
    });

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        body && typeof body === "object" && "message" in body
          ? String((body as { message: unknown }).message)
          : `HTTP ${response.status}`;
      return { status: "failed", detail: message };
    }
    const id =
      body && typeof body === "object" && "id" in body
        ? String((body as { id: unknown }).id)
        : "sent";
    return { status: "sent", detail: id };
  } catch (error) {
    return { status: "failed", detail: error instanceof Error ? error.message : "Network error" };
  }
}

/**
 * SMS through Robase.
 *
 * Only the kinds in {@link SMS_KINDS} are ever sent — an SMS costs many times
 * what an email does, so the guest gets one when the booking is made and one if
 * it is cancelled. Everything in between is email.
 *
 * The SDK retries network failures, 429s and 5xx on its own, reusing one
 * idempotency key so a retry replays the original response rather than charging
 * twice. That key is the booking and the kind, which also makes a repeated sweep
 * free. A staff resend passes no key: they meant it.
 */
async function sendSms(
  kind: Kind,
  ctx: NotifyContext,
  idempotencyKey?: string,
): Promise<Result> {
  if (!SMS_KINDS.has(kind)) {
    return { status: "skipped", detail: "This message is email-only" };
  }
  if (!ctx.policy.smsEnabled) {
    return { status: "skipped", detail: "SMS is switched off in settings" };
  }
  const apiKey = process.env.ROBASE_API_KEY;
  if (!apiKey) return { status: "skipped", detail: "ROBASE_API_KEY is not set" };

  const to = toE164(ctx.booking.guest.phone);
  if (!to) return { status: "skipped", detail: "No usable phone number on the booking" };

  try {
    const robase = new Robase({ apiKey });
    const message = await robase.sms.send(
      {
        phone_number: to,
        message: smsBody(kind, ctx),
        metadata: { reference: ctx.booking.reference, kind },
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    return {
      status: "sent",
      detail: `${message.id} (${message.credit_cost} credit${message.credit_cost === 1 ? "" : "s"})`,
    };
  } catch (error) {
    if (isRobaseError(error)) {
      return { status: "failed", detail: `${error.type}: ${error.message}` };
    }
    return {
      status: "failed",
      detail: error instanceof Error ? error.message : "Network error",
    };
  }
}

/* ---------------------------------------------------------------- dispatch */

/**
 * Send one kind of message, and write down what happened.
 *
 * The channels are independent: a guest with no email address still gets their
 * SMS, a failed SMS does not cost anyone their emailed booking document, and
 * each outcome is logged separately so the desk can tell "never sent" from
 * "sent and ignored".
 */
type ActionCtx = GenericActionCtx<DataModel>;

/**
 * The delivery itself, as a plain function.
 *
 * `dispatch` and the nightly sweep both need it, and one action calling another
 * would buy nothing but a second function invocation — they run in the same
 * runtime.
 */
async function deliver(
  ctx: ActionCtx,
  bookingId: Id<"bookings">,
  kind: Kind,
  force: boolean,
): Promise<void> {
  const context: NotifyContext | null = await ctx.runQuery(internal.notify.context, {
    bookingId,
  });
  if (!context) return;
  if (!force && (context.booking.remindersSent ?? []).includes(kind)) return;

  const [email, sms] = await Promise.all([
    sendEmail(kind, context),
    sendSms(kind, context, force ? undefined : `${bookingId}:${kind}`),
  ]);
  const at = Date.now();

  for (const [channel, result] of [
    ["email", email],
    ["sms", sms],
  ] as const) {
    if (result.status === "failed") {
      console.error(
        `[notify] ${channel} ${kind} for ${context.booking.reference}: ${result.detail}`,
      );
    }
    await ctx.runMutation(internal.bookings.recordNotification, {
      id: bookingId,
      entry: { channel, kind, status: result.status, detail: result.detail, at },
    });
  }
}

export const dispatch = internalAction({
  args: {
    bookingId: v.id("bookings"),
    kind: notificationKind,
    /** Staff resending by hand: send again even if this kind already went out. */
    force: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await deliver(ctx, args.bookingId, args.kind as Kind, args.force ?? false);
    return null;
  },
});

/**
 * The nightly sweep, run from `crons.ts`.
 *
 * Reminders first, releases second, and in that order deliberately: a guest
 * arriving today should get their welcome message before the same run has any
 * chance of releasing a room whose hold expired earlier in the day.
 */
export const runReminderSweep = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    const due: { bookingId: Id<"bookings">; kind: string }[] = await ctx.runQuery(
      internal.bookings.dueReminders,
      { now },
    );
    for (const item of due) {
      await deliver(ctx, item.bookingId, item.kind as Kind, false);
    }

    const released: string[] = await ctx.runMutation(
      internal.bookings.releaseExpiredHolds,
      { now },
    );
    if (released.length) {
      console.log(`[notify] released ${released.length} unclaimed room(s): ${released.join(", ")}`);
    }

    return null;
  },
});
