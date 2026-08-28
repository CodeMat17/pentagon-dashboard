/**
 * Client-side mirror of `convex/auth.ts`.
 *
 * This decides what the UI *offers*; Convex decides what actually happens. Hiding
 * a button here is a courtesy, never a control — every mutation re-checks.
 */

export type Role = "owner" | "admin" | "editor" | "viewer";

const RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

export function atLeast(role: Role | undefined, minimum: Role) {
  return role ? RANK[role] >= RANK[minimum] : false;
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Administrator",
  editor: "Editor",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full control, including other administrators. Cannot be removed.",
  admin: "Everything an editor can do, plus staff, settings and promo deletion.",
  editor: "Create, edit and delete content; manage reservations and enquiries.",
  viewer: "Read-only: can see content, reservations and enquiries.",
};
