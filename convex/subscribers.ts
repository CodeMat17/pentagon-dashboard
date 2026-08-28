import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireViewer, requireEditor } from "./auth";

/** Newsletter list. Re-subscribing an existing address is a no-op, not an error. */

export const subscribe = mutation({
  args: { email: v.string(), source: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("That email address does not look right.");

    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      if (existing.status !== "subscribed") {
        await ctx.db.patch(existing._id, { status: "subscribed" });
      }
      return null;
    }

    await ctx.db.insert("subscribers", {
      email,
      status: "subscribed",
      source: args.source ?? "website",
    });
    return null;
  },
});

export const unsubscribe = mutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { status: "unsubscribed" });
    return null;
  },
});

export const page = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireViewer(ctx);
    return await ctx.db.query("subscribers").order("desc").paginate(args.paginationOpts);
  },
});

export const remove = mutation({
  args: { id: v.id("subscribers") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});
