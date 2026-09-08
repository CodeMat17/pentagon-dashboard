"use node";

import { v } from "convex/values";

import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  attractions,
  diningVenues,
  extraServices,
  facilityGroups,
  faqs,
  galleryImages,
  guestServices,
  offers,
  posts,
  promoCodes,
  reviews,
  rooms,
  venues,
} from "./seedData";

/**
 * One-shot import of the website's original hard-coded content.
 *
 * Two entry points, one body:
 *
 * - `seed:run` — the dashboard's Settings button. Public, so it checks that the
 *   caller is an admin.
 * - `seed:fromCli` — `npx convex run seed:fromCli`. Internal, so it is not
 *   callable from any browser; the CLI's deploy credentials are the authorisation,
 *   and there is no Clerk identity to check on a fresh deployment.
 *
 * It is destructive on purpose — it wipes the content tables (and their storage
 * files) and rebuilds them, so re-running it after a bad import is safe. Guest
 * data (bookings, messages, subscribers) and staff are never touched.
 *
 * Every image referenced by the original data is downloaded once and stored in
 * Convex storage, so after seeding nothing on the site points at a third party.
 */
async function importContent(ctx: ActionCtx) {
  // Collect every distinct source image first — several rows share one photo.
  const sources = new Set<string>();
  for (const room of rooms) for (const img of room.images) sources.add(img.src);
  for (const venue of diningVenues) sources.add(venue.image.src);
  for (const venue of venues) sources.add(venue.image.src);
  for (const offer of offers) sources.add(offer.image.src);
  for (const post of posts) sources.add(post.image.src);
  for (const img of galleryImages) sources.add(img.src);

  const stored: Record<string, { storageId: string; url: string }> = {};
  // Sequential on purpose: a burst of 40 parallel fetches gets rate-limited.
  for (const src of sources) {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Could not download ${src} (${response.status}).`);
    const blob = await response.blob();
    const storageId = await ctx.storage.store(blob);
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error(`Stored ${src} but could not resolve its URL.`);
    stored[src] = { storageId, url };
  }

  const image = (img: { src: string; alt: string }) => ({
    storageId: stored[img.src].storageId,
    url: stored[img.src].url,
    alt: img.alt,
  });

  await ctx.runMutation(internal.seedInternal.replaceAll, {
    rooms: rooms.map((room, order) => ({
      ...room,
      images: room.images.map(image),
      order,
      published: true,
    })),
    facilityGroups: facilityGroups.map((group, order) => ({ ...group, order })),
    diningVenues: diningVenues.map((venue, order) => ({
      ...venue,
      image: image(venue.image),
      order,
    })),
    venues: venues.map((venue, order) => ({
      ...venue,
      image: image(venue.image),
      order,
    })),
    offers: offers.map((offer, order) => ({
      ...offer,
      image: image(offer.image),
      order,
      published: true,
    })),
    extraServices: extraServices.map(({ id, ...extra }, order) => ({
      ...extra,
      key: id,
      order,
      active: true,
    })),
    promoCodes: Object.entries(promoCodes).map(([code, promo]) => ({
      code,
      ...promo,
      active: true,
    })),
    reviews: reviews.map((review, order) => ({ ...review, order, published: true })),
    attractions: attractions.map((attraction, order) => ({ ...attraction, order })),
    guestServices: guestServices.map((service, order) => ({ ...service, order })),
    faqs: faqs.map((faq, order) => ({ ...faq, order, published: true })),
    galleryImages: galleryImages.map((img, order) => ({
      image: image(img),
      category: img.category,
      tall: img.tall ?? false,
      order,
    })),
    posts: posts.map((post) => ({
      ...post,
      image: image(post.image),
      published: true,
    })),
  });

  return { uploaded: sources.size, tables: 13 };
}

export const run = action({
  args: { confirm: v.string() },
  returns: v.object({ uploaded: v.number(), tables: v.number() }),
  handler: async (ctx, args) => {
    if (args.confirm !== "REPLACE ALL CONTENT") {
      throw new Error('Pass {"confirm":"REPLACE ALL CONTENT"} to run the import.');
    }
    await ctx.runQuery(internal.seedInternal.assertAdmin, {});
    return await importContent(ctx);
  },
});

/** Seeding a brand-new deployment, before anyone has signed in. */
export const fromCli = internalAction({
  args: {},
  returns: v.object({ uploaded: v.number(), tables: v.number() }),
  handler: async (ctx) => await importContent(ctx),
});

/**
 * Re-import just the room inventory, leaving every other content table alone.
 * Same download-then-replace shape as `importContent`, scoped to one table.
 */
async function importRooms(ctx: ActionCtx): Promise<{ uploaded: number; rooms: number }> {
  const sources = new Set<string>();
  for (const room of rooms) for (const img of room.images) sources.add(img.src);

  const stored: Record<string, { storageId: string; url: string }> = {};
  for (const src of sources) {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Could not download ${src} (${response.status}).`);
    const blob = await response.blob();
    const storageId = await ctx.storage.store(blob);
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error(`Stored ${src} but could not resolve its URL.`);
    stored[src] = { storageId, url };
  }

  const count: number = await ctx.runMutation(internal.seedInternal.replaceRooms, {
    rooms: rooms.map((room, order) => ({
      ...room,
      images: room.images.map((img) => ({
        storageId: stored[img.src].storageId,
        url: stored[img.src].url,
        alt: img.alt,
      })),
      order,
      published: true,
    })),
  });

  return { uploaded: sources.size, rooms: count };
}

/** `npx convex run seed:roomsOnly` (add `--prod` to target production). */
export const roomsOnly = internalAction({
  args: {},
  returns: v.object({ uploaded: v.number(), rooms: v.number() }),
  handler: async (ctx) => await importRooms(ctx),
});
