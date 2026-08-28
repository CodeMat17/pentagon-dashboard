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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
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
