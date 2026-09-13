import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

/**
 * The scheduled half of the reservation lifecycle.
 *
 * Two jobs, both handled by `notify.runReminderSweep`, both idempotent:
 *
 * - **Reminders.** A "see you tomorrow" email the evening before arrival, and a
 *   "your room is ready" email on the morning of the day — neither on the day the
 *   booking was made. Forgotten reservations are the largest cause of
 *   no-shows in a pay-at-hotel model, and a message the evening before recovers
 *   most of them.
 * - **Releases.** Any confirmed reservation whose hold has expired becomes a
 *   no-show and its room goes back on sale.
 *
 * Timing is expressed in UTC because Convex crons are; Nigeria is UTC+1 with no
 * daylight saving, so 08:00 UTC is 09:00 in Port Harcourt.
 *
 * Running hourly rather than once a day matters for releases: a hold that
 * expires at 20:00 should free the room that evening, while there is still
 * someone at the desk to sell it. The sweep is safe to repeat — `remindersSent`
 * stops a guest ever getting the same message twice.
 */
const crons = cronJobs();

crons.interval(
  "reservation reminders and no-show releases",
  { hours: 1 },
  internal.notify.runReminderSweep,
  {},
);

/**
 * Check-out. At 12:00 noon Lagos time (11:00 UTC) every stay whose check-out
 * date is today is marked completed and its room goes back on sale. The hourly
 * sweep runs the same idempotent mutation as a safety net.
 */
crons.cron(
  "complete stays at check-out",
  "0 11 * * *",
  internal.bookings.completeFinishedStays,
  {},
);

export default crons;
