import {
  HOUR,
  MINUTE,
  RateLimiter,
  type RateLimitConfig,
} from "@convex-dev/rate-limiter";

import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";

/**
 * Throttling for the three mutations the public website may call without
 * signing in: `bookings.create`, `messages.send` and `subscribers.subscribe`.
 *
 * Everything else in this backend is behind `requireViewer`/`requireEditor`/
 * `requireAdmin`, where the staff row is the limit. These three have no such
 * gate by design — a guest reserving a room has no account — so a script can
 * otherwise fill the arrivals board with invented reservations, and every one of
 * them costs a real email and a *billed* SMS through `notify.dispatch`.
 *
 * Each mutation gets two limits, and must pass both:
 *
 * - **Per-guest**, keyed on the phone or email they gave. Generous enough that a
 *   family booking three rooms one after another never sees it, tight enough
 *   that a loop does. Token buckets, so an ordinary burst is fine but a sustained
 *   rate is not.
 * - **Global**, as the backstop for spam that rotates the key on every request —
 *   which the per-guest limit cannot see. Fixed windows, sized well above a busy
 *   day at a hotel of this size, so real guests never meet them.
 *
 * The global ceilings are the ones to raise if the hotel grows; the per-guest
 * ones should stay where they are.
 *
 * A caveat worth knowing: rate limit writes are part of the calling mutation's
 * transaction, so a request that fails validation rolls its consumption back and
 * costs the sender nothing. These limits throttle *accepted* work — they are not
 * a shield against a flood of deliberately malformed payloads, and they are not
 * DDOS protection. For the booking form specifically, the harder guarantee is a
 * CAPTCHA or Clerk bot protection at the edge; this is defence in depth beneath
 * it.
 */
const limits = {
  /** ~5/hour per phone number, 5 in a burst: enough for one guest's rooms. */
  bookingPerGuest: { kind: "token bucket", rate: 5, period: HOUR, capacity: 5 },
  /** A busy day here is a few dozen reservations, not 100 in an hour. */
  bookingGlobal: { kind: "fixed window", rate: 100, period: HOUR },

  /** Enquiries: a guest may send a couple, then think. */
  messagePerSender: { kind: "token bucket", rate: 5, period: HOUR, capacity: 3 },
  messageGlobal: { kind: "fixed window", rate: 200, period: HOUR },

  /** Signing up to the newsletter is a once-ever act; this is pure abuse cover. */
  subscribePerEmail: { kind: "token bucket", rate: 3, period: HOUR, capacity: 3 },
  subscribeGlobal: { kind: "fixed window", rate: 100, period: HOUR },
} satisfies Record<string, RateLimitConfig>;

export const rateLimiter = new RateLimiter(components.rateLimiter, limits);

type LimitName = keyof typeof limits;

/** "a moment", "about 4 minutes", "about 2 hours" — for a guest, not a log. */
function humaniseWait(retryAfter: number | undefined): string {
  if (!retryAfter || retryAfter < MINUTE) return "in a moment";
  const minutes = Math.ceil(retryAfter / MINUTE);
  if (minutes < 60) return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Consume one token, or throw a message a guest can act on.
 *
 * The thrown text matters: these mutations are called straight from the public
 * website's forms, which surface `error.message` to the person typing. It says
 * when to try again, and it points at the phone — someone with a real
 * reservation to make must never hit a dead end here.
 */
export async function throttle(
  ctx: MutationCtx,
  name: LimitName,
  key: string | undefined,
  message: string,
): Promise<void> {
  const status = await rateLimiter.limit(ctx, name, key ? { key } : {});
  if (!status.ok) {
    throw new Error(`${message} Please try again ${humaniseWait(status.retryAfter)}.`);
  }
}
