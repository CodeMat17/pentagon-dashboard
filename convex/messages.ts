import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireViewer, requireEditor } from "./auth";

/**
 * The inbox: contact forms, event quote requests and table reservations.
 *
 * Kind-specific fields live in `details` as label/value pairs rather than in
 * three near-identical tables — the dashboard renders them generically, and
 * adding a fourth form needs no migration.
 */

const kind = v.union(
  v.literal("contact"),
  v.literal("event-quote"),
  v.literal("table-reservation"),
);

const status = v.union(v.literal("new"), v.literal("read"), v.literal("archived"));

/** Public — every website form lands here. */
export const send = mutation({
  args: {
    kind,
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    subject: v.string(),
    body: v.string(),
    details: v.array(v.object({ label: v.string(), value: v.string() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("That email address does not look right.");
    await ctx.db.insert("messages", {
      ...args,
      email,
      name: args.name.trim(),
      status: "new",
    });
    return null;
  },
});

export const page = query({
  args: {
    status: v.optional(status),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireViewer(ctx);
    const q = args.status
      ? ctx.db.query("messages").withIndex("by_status", (i) => i.eq("status", args.status!))
      : ctx.db.query("messages");
    return await q.order("desc").paginate(args.paginationOpts);
  },
});

/** Just the unread count for the sidebar badge — `take` caps the read at 100. */
export const unreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    await requireViewer(ctx);
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_status", (q) => q.eq("status", "new"))
      .take(100);
    return unread.length;
  },
});

export const setStatus = mutation({
  args: { id: v.id("messages"), status },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const remove = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});
