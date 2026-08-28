import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { image } from "./schema";
import { requireEditor } from "./auth";
import { deleteImages } from "./files";

const fields = {
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  date: v.string(),
  tag: v.string(),
  readMinutes: v.number(),
  image,
  body: v.array(v.string()),
  published: v.boolean(),
};

/** Public. Newest first, without the article body — the index only shows cards. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_published_date", (q) => q.eq("published", true))
      .order("desc")
      .collect();
    return posts.map((post) => {
      const { body, ...rest } = post;
      void body;
      return rest;
    });
  },
});

/** Public. */
export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return post?.published ? post : null;
  },
});

/** Dashboard. */
export const all = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("posts").withIndex("by_slug").collect(),
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const clash = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (clash) throw new Error(`A post already uses the slug "${args.slug}".`);
    return await ctx.db.insert("posts", args);
  },
});

export const update = mutation({
  args: { id: v.id("posts"), ...fields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("That post no longer exists.");
    if (existing.image.storageId !== patch.image.storageId) {
      await deleteImages(ctx, [existing.image]);
    }
    await ctx.db.patch(id, patch);
  },
});

export const setPublished = mutation({
  args: { id: v.id("posts"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, { published: args.published });
  },
});

export const remove = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) return;
    await deleteImages(ctx, [post.image]);
    await ctx.db.delete(args.id);
  },
});
