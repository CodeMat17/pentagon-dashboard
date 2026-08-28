# Convex backend — Pentagon Hotel

This directory is the single source of truth for the hotel's content, bookings and
enquiries. The dashboard (this app) writes to it; the public website reads from it.

- `schema.ts`     — every table and index.
- `auth.ts`       — Clerk identity → `users` row, roles, and the guards every mutation uses.
- `files.ts`      — Convex storage: upload URLs, and deletion that never leaves orphans.
- `<domain>.ts`   — one module per content type, each exposing a public `list` for the
  website and role-guarded `create`/`update`/`remove` for the dashboard.

## Optimisation notes

- **Image URLs are denormalised.** Every stored image keeps `{ storageId, url, alt }`.
  The URL is resolved once, at upload time, so no read path ever awaits
  `ctx.storage.getUrl()` — a list of 40 gallery images costs one index scan, not 41
  round trips.
- **Every read goes through an index.** No `.filter()` on a full table scan; published
  /ordering filters live in `by_*` indexes.
- **Public list queries return only what the page renders.** Detail-only fields
  (long copy, body paragraphs) are fetched by slug on the detail route.
