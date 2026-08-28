import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/**
 * Authorization lives here, not in Clerk.
 *
 * Clerk authenticates (it proves the `sub` claim). Convex authorizes: the `users`
 * table maps that subject to a role, and every mutation in this backend runs
 * through one of the guards below. A signed-in Clerk user with no row — or an
 * inactive one — can read nothing private and write nothing at all.
 */

export type Role = Doc<"users">["role"];

/** Higher wins. Every guard is a `>=` comparison against one of these. */
const RANK: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function atLeast(role: Role, minimum: Role) {
  return RANK[role] >= RANK[minimum];
}

/** The signed-in staff row, or `null` for signed-out / unknown / deactivated. */
export async function currentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
    .unique();

  if (user) return user.active ? user : null;

  // Invited-but-never-signed-in staff are stored by email with no subject yet.
  const email = identity.email?.toLowerCase();
  if (!email) return null;
  const invited = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

  return invited?.active ? invited : null;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  minimum: Role,
): Promise<Doc<"users">> {
  const user = await currentUser(ctx);
  if (!user) {
    throw new Error("Not authorised — sign in with an account that has dashboard access.");
  }
  if (!atLeast(user.role, minimum)) {
    throw new Error(`Not authorised — this action needs the ${minimum} role or higher.`);
  }
  return user;
}

/** Read private data (bookings, messages, staff). */
export const requireViewer = (ctx: QueryCtx | MutationCtx) => requireRole(ctx, "viewer");

/** Create, update and delete content. */
export const requireEditor = (ctx: QueryCtx | MutationCtx) => requireRole(ctx, "editor");

/** Manage staff, settings and destructive operations. */
export const requireAdmin = (ctx: QueryCtx | MutationCtx) => requireRole(ctx, "admin");
