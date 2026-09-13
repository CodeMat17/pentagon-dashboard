import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, type MutationCtx } from "./_generated/server";

/**
 * Tells the public website that its content changed.
 *
 * The site (pentagon-hotel) serves prerendered pages and only re-reads Convex
 * when those pages are marked stale. Rather than have it poll on a short timer —
 * which costs server time whether or not anything changed — every content
 * mutation calls `siteChanged`, and the site refreshes on demand.
 *
 * The call is scheduled, not made inline: the scheduler is transactional, so a
 * mutation that throws after this line never pings the site, and a slow or
 * unreachable site never slows down a save in the dashboard. If the ping fails,
 * the site's own daily revalidation still picks the edit up.
 *
 * Needs `SITE_URL` and `REVALIDATE_SECRET` on the Convex deployment; without the
 * secret this does nothing.
 */

const SITE_URL_FALLBACK = "https://pentagoninternationalhotel.com";

export async function siteChanged(ctx: MutationCtx) {
  await ctx.scheduler.runAfter(0, internal.site.revalidate, {});
}

export const revalidate = internalAction({
  args: {},
  returns: v.null(),
  handler: async () => {
    const secret = process.env.REVALIDATE_SECRET;
    if (!secret) return null;

    const base = (process.env.SITE_URL || SITE_URL_FALLBACK).replace(/\/$/, "");
    try {
      const response = await fetch(`${base}/api/revalidate`, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      });
      if (!response.ok) {
        console.error(`[site] revalidate returned ${response.status}`);
      }
    } catch (error) {
      console.error("[site] revalidate failed:", error);
    }
    return null;
  },
});
