import type { Doc } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * The reservation and no-show rules, in one place.
 *
 * Pentagon takes no payment online, so the only thing standing between a
 * reservation and an empty room on the night is the *hold*: the hotel keeps the
 * room against the guest's name until a stated time on the arrival date, and
 * releases it after that if the guest has neither arrived nor called.
 *
 * Every date here is Nigerian local time. West Africa Time is UTC+1 with no
 * daylight saving, so the offset is a constant rather than a timezone database
 * lookup — and the arithmetic gives the same answer wherever it runs.
 */

/** West Africa Time, in milliseconds. Nigeria observes no daylight saving. */
const WAT_OFFSET_MS = 60 * 60 * 1000;

export const DEFAULTS = {
  /** Rooms are held to 8pm on the arrival date unless settings say otherwise. */
  holdUntilTime: "20:00",
  cancellationPolicy:
    "Cancel free of charge up to 24 hours before your arrival date. Inside 24 hours, one night may be charged.",
  noShowPolicy:
    "Your room is held until 20:00 on your arrival date. If you have not arrived or contacted us by then, the reservation is released and the room offered to other guests. Call or WhatsApp us any time if you are running late — we will hold it for you.",
} as const;

/** Today's date in Nigeria, as `yyyy-mm-dd`. */
export function todayInLagos(now: number = Date.now()): string {
  return new Date(now + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** The hour of the day in Nigeria, 0–23. */
export function hourInLagos(now: number = Date.now()): number {
  return new Date(now + WAT_OFFSET_MS).getUTCHours();
}

/** `yyyy-mm-dd` shifted by whole days, staying in Nigerian local time. */
export function shiftDate(date: string, days: number): string {
  const at = Date.parse(`${date}T12:00:00+01:00`) + days * 86_400_000;
  return new Date(at + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant a `yyyy-mm-ddThh:mm` local hold expires, in epoch milliseconds. */
export function holdExpiresAt(holdUntil: string): number {
  return Date.parse(`${holdUntil}:00+01:00`);
}

/** `2026-09-15` + `20:00` → `2026-09-15T20:00`. */
export function holdUntilFor(checkIn: string, time: string): string {
  return `${checkIn}T${time}`;
}

export interface Policy {
  holdUntilTime: string;
  cancellationPolicy: string;
  noShowPolicy: string;
  remindersEnabled: boolean;
  smsEnabled: boolean;
  checkIn: string;
  checkOut: string;
}

/**
 * The live policy, with the shipped defaults filling any gap.
 *
 * The settings row is optional — a fresh deployment has none, and the policy
 * fields were added after the first release — so every read is defaulted rather
 * than asserted. A missing setting must never stop a guest booking.
 */
export async function getPolicy(ctx: QueryCtx | MutationCtx): Promise<Policy> {
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "site"))
    .unique();
  return policyFrom(settings);
}

export function policyFrom(settings: Doc<"settings"> | null): Policy {
  return {
    holdUntilTime: settings?.holdUntilTime || DEFAULTS.holdUntilTime,
    cancellationPolicy: settings?.cancellationPolicy || DEFAULTS.cancellationPolicy,
    noShowPolicy: settings?.noShowPolicy || DEFAULTS.noShowPolicy,
    remindersEnabled: settings?.remindersEnabled ?? true,
    smsEnabled: settings?.smsEnabled ?? true,
    checkIn: settings?.checkIn || "14:00",
    checkOut: settings?.checkOut || "12:00",
  };
}
