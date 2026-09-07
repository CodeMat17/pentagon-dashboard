/** Formatting shared across every screen. Naira, dates and slugs. */

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(amount: number) {
  return naira.format(amount);
}

const compactNaira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** For stat tiles, where "₦4.2M" beats "₦4,235,000". */
export function formatNairaCompact(amount: number) {
  return compactNaira.format(amount);
}

const longDate = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : longDate.format(date);
}

export function formatDateTime(ms: number) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms));
}

/**
 * `20:00` → `8:00 pm`. Every clock face in the dashboard reads through here.
 *
 * Times are *stored* as 24-hour `HH:MM` — that is what a time input produces,
 * what Convex validates, and what the guest-facing wording in `convex/notify.ts`
 * parses. Only the reading changes: staff at the desk think in am/pm, and
 * nothing on this screen should make them translate 20:00 in their head.
 *
 * Anything that is not `HH:MM` comes back untouched, so a free-typed
 * "after midnight" survives a round trip.
 */
export function formatTime12(time: string) {
  const match = /^([0-9]{1,2}):([0-9]{2})$/.exec(time.trim());
  if (!match) return time;
  const hour = Number(match[1]);
  if (hour > 23 || Number(match[2]) > 59) return time;
  const suffix = hour < 12 ? "am" : "pm";
  return `${hour % 12 === 0 ? 12 : hour % 12}:${match[2]} ${suffix}`;
}

/**
 * The inverse: `8:00 pm`, `8pm` and `20:00` all become `20:00`.
 *
 * Deliberately forgiving about what gets typed — separator, minutes and the
 * space before am/pm are all optional — because the alternative is a form that
 * rejects "8pm". Returns null when no reading of the input is a real time,
 * which is the caller's cue to keep whatever was stored.
 */
export function parseTime12(input: string) {
  const match = /^([0-9]{1,2})(?::([0-9]{2}))? *(am|pm)?$/i.exec(input.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const suffix = match[3]?.toLowerCase();
  if (minute > 59) return null;
  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (suffix === "pm" ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "Executive Spring Suite" → "executive-spring-suite". */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Today in the `yyyy-mm-dd` form the booking dates use. */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Today in Nigeria, `yyyy-mm-dd`.
 *
 * `todayISO` reads the browser's own clock, which is right for staff standing at
 * the desk and wrong for anyone opening the dashboard from another timezone.
 * Reservation dates are Nigerian dates, so the arrivals board asks for one.
 * West Africa Time is UTC+1 all year, so the offset is a constant.
 */
export function todayInLagos(now: number = Date.now()) {
  return new Date(now + 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** `2026-09-15T20:00` → `8:00 pm, 15 Sep 2026`. */
export function formatHold(holdUntil: string) {
  const [date, time] = holdUntil.split("T");
  return time ? `${formatTime12(time)}, ${formatDate(date)}` : formatDate(holdUntil);
}

/** How long until a hold expires, as "in 3h 20m" or "expired 40m ago". */
export function holdCountdown(holdUntil: string, now: number = Date.now()) {
  const at = Date.parse(`${holdUntil}:00+01:00`);
  if (Number.isNaN(at)) return "";
  const minutes = Math.round(Math.abs(at - now) / 60_000);
  const span =
    minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return at > now ? `in ${span}` : `expired ${span} ago`;
}
