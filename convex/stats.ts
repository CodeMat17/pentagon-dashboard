import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireViewer } from "./auth";

/**
 * Numbers for the overview screen.
 *
 * Convex has no `count()`, and a dashboard tile is not worth scanning a table
 * that grows forever — so every read here is capped with `.take()` and the tiles
 * render "99+" past the cap. Content tables are small and bounded, so those are
 * counted exactly.
 */

const CAP = 500;

export const overview = query({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    await requireViewer(ctx);

    const [rooms, offers, posts, gallery, newMessages, upcoming, recentBookings] =
      await Promise.all([
        ctx.db.query("rooms").withIndex("by_slug").collect(),
        ctx.db.query("offers").withIndex("by_slug").collect(),
        ctx.db.query("posts").withIndex("by_slug").collect(),
        ctx.db.query("galleryImages").withIndex("by_order").take(CAP),
        ctx.db.query("messages").withIndex("by_status", (q) => q.eq("status", "new")).take(100),
        ctx.db
          .query("bookings")
          .withIndex("by_checkIn", (q) => q.gte("checkIn", args.today))
          .take(CAP),
        ctx.db.query("bookings").order("desc").take(30),
      ]);

    const revenue = upcoming
      .filter((booking) => booking.status !== "cancelled")
      .reduce((sum, booking) => sum + booking.total, 0);

    return {
      rooms: { total: rooms.length, published: rooms.filter((r) => r.published).length },
      offers: { total: offers.length, published: offers.filter((o) => o.published).length },
      posts: { total: posts.length, published: posts.filter((p) => p.published).length },
      galleryCount: gallery.length,
      unreadMessages: newMessages.length,
      upcomingStays: upcoming.filter((b) => b.status !== "cancelled").length,
      upcomingRevenue: revenue,
      recentBookings: recentBookings.slice(0, 6).map((booking) => ({
        _id: booking._id,
        reference: booking.reference,
        guest: `${booking.guest.firstName} ${booking.guest.lastName}`.trim(),
        roomName: booking.roomName,
        checkIn: booking.checkIn,
        nights: booking.nights,
        total: booking.total,
        status: booking.status,
      })),
    };
  },
});
