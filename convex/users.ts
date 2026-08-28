import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { role } from "./schema";
import { currentUser, requireAdmin } from "./auth";

/**
 * The signed-in staff member, or `null`. The dashboard shell calls this once and
 * gates every route on the result, so it must stay cheap: one indexed lookup.
 */
export const me = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
      imageUrl: v.optional(v.string()),
      role,
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      role: user.role,
    };
  },
});

/**
 * Called once per session from the dashboard shell.
 *
 * Three cases, in order: an existing row (touch it), an invitation matched by
 * email (claim it), or an empty `users` table (bootstrap the first signer as
 * owner). Anyone else gets a `viewer` row that an admin must promote — signing
 * in never grants write access by itself.
 */
export const sync = mutation({
  args: {},
  returns: v.union(role, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const email = (identity.email ?? "").toLowerCase();
    const name = identity.name ?? identity.nickname ?? email.split("@")[0] ?? "Staff";
    const imageUrl = identity.pictureUrl ?? undefined;
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
      .unique();

    if (existing) {
      // Only write when something actually changed — `sync` runs on every load.
      const stale =
        existing.name !== name ||
        existing.email !== email ||
        existing.imageUrl !== imageUrl ||
        now - existing.lastSeenAt > 60_000;
      if (stale) {
        await ctx.db.patch(existing._id, { name, email, imageUrl, lastSeenAt: now });
      }
      return existing.active ? existing.role : null;
    }

    if (email) {
      const invited = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (invited) {
        await ctx.db.patch(invited._id, {
          subject: identity.subject,
          name,
          imageUrl,
          lastSeenAt: now,
        });
        return invited.active ? invited.role : null;
      }
    }

    // `.first()` on an unfiltered table is a single-document read, not a scan.
    const anyUser = await ctx.db.query("users").first();
    const bootstrap = anyUser === null;

    await ctx.db.insert("users", {
      subject: identity.subject,
      email,
      name,
      imageUrl,
      role: bootstrap ? "owner" : "viewer",
      active: bootstrap,
      lastSeenAt: now,
    });

    return bootstrap ? "owner" : null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});

export const invite = mutation({
  args: { email: v.string(), name: v.string(), role },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new Error("That email already has dashboard access.");

    // `subject` is empty until they sign in; `currentUser` claims the row by email.
    return await ctx.db.insert("users", {
      subject: "",
      email,
      name: args.name.trim() || email,
      role: args.role,
      active: true,
      lastSeenAt: 0,
    });
  },
});

export const setRole = mutation({
  args: { id: v.id("users"), role },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const target = await ctx.db.get(args.id);
    if (!target) throw new Error("No such user.");
    if (target.role === "owner" && actor.role !== "owner") {
      throw new Error("Only the owner can change the owner's role.");
    }
    if (actor._id === args.id) throw new Error("You cannot change your own role.");
    await ctx.db.patch(args.id, { role: args.role });
  },
});

export const setActive = mutation({
  args: { id: v.id("users"), active: v.boolean() },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    if (actor._id === args.id) throw new Error("You cannot deactivate yourself.");
    const target = await ctx.db.get(args.id);
    if (target?.role === "owner") throw new Error("The owner cannot be deactivated.");
    await ctx.db.patch(args.id, { active: args.active });
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    if (actor._id === args.id) throw new Error("You cannot remove yourself.");
    const target = await ctx.db.get(args.id);
    if (target?.role === "owner") throw new Error("The owner cannot be removed.");
    await ctx.db.delete(args.id);
  },
});
