import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { bedType, image, roomCategory } from "./schema";
import { requireEditor } from "./auth";
import { deleteImages, orphaned } from "./files";

/**
 * Rooms — the heaviest content type on the site, so the read paths are split:
 * `list` serves the index and the booking flow (no long copy), `bySlug` serves
 * the one detail page that needs it.
 */

const fields = {
  slug: v.string(),
  name: v.string(),
  category: roomCategory,
  tagline: v.string(),
  description: v.string(),
  longDescription: v.array(v.string()),
  sizeSqm: v.number(),
  bed: bedType,
  maxAdults: v.number(),
  maxChildren: v.number(),
  view: v.string(),
  bathroom: v.string(),
  amenities: v.array(v.string()),
  images: v.array(image),
  rate: v.number(),
  rackRate: v.optional(v.number()),
  accessible: v.boolean(),
  inventory: v.number(),
  featured: v.boolean(),
  cancellation: v.string(),
  order: v.number(),
  published: v.boolean(),
};

/**
 * The public site treats `images[0]` as the hero — the room card, the booking
 * flow thumbnail and the OpenGraph tag all index it unguarded — so a published
 * room without photography would crash those pages. Publishing is gated here,
 * on every path that can set the flag, rather than in the form alone.
 */
function requirePhotograph(published: boolean, images: { url: string }[]) {
  if (published && images.length === 0) {
    throw new Error(
      "A published room needs at least one photograph. Add one, or save it unpublished.",
    );
  }
}

/* -------------------------------------------------------------------- read */

/** Public. Published rooms in display order, without the detail-page copy. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_published_order", (q) => q.eq("published", true))
      .collect();

    // The index and the booking flow never render the long copy; leaving it out
    // keeps the payload small on the page that fetches the most rooms.
    return rooms.map((room) => {
      const { longDescription, ...rest } = room;
      void longDescription;
      return rest;
    });
  },
});

/** Public. One room, with everything the detail page renders. */
export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return room?.published ? room : null;
  },
});

/** Dashboard. Everything, published or not. */
export const all = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("rooms").withIndex("by_slug").collect();
  },
});

/* ------------------------------------------------------------------- write */

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const clash = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (clash) throw new Error(`A room already uses the slug "${args.slug}".`);
    requirePhotograph(args.published, args.images);
    return await ctx.db.insert("rooms", args);
  },
});

export const update = mutation({
  args: { id: v.id("rooms"), ...fields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("That room no longer exists.");

    if (patch.slug !== existing.slug) {
      const clash = await ctx.db
        .query("rooms")
        .withIndex("by_slug", (q) => q.eq("slug", patch.slug))
        .unique();
      if (clash) throw new Error(`A room already uses the slug "${patch.slug}".`);
    }

    requirePhotograph(patch.published, patch.images);

    // Images dropped from the gallery lose their storage file too.
    await deleteImages(ctx, orphaned(existing.images, patch.images));
    await ctx.db.patch(id, patch);
  },
});

export const setPublished = mutation({
  args: { id: v.id("rooms"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const room = await ctx.db.get(args.id);
    if (!room) throw new Error("That room no longer exists.");
    requirePhotograph(args.published, room.images);
    await ctx.db.patch(args.id, { published: args.published });
  },
});

export const remove = mutation({
  args: { id: v.id("rooms") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const room = await ctx.db.get(args.id);
    if (!room) return;
    await deleteImages(ctx, room.images);
    await ctx.db.delete(args.id);
  },
});

/** Persists a drag-and-drop reorder in one transaction. */
export const reorder = mutation({
  args: { ids: v.array(v.id("rooms")) },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await Promise.all(
      args.ids.map((id, index) => ctx.db.patch(id, { order: index })),
    );
  },
});
