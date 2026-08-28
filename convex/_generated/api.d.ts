/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as dining from "../dining.js";
import type * as directory from "../directory.js";
import type * as facilities from "../facilities.js";
import type * as faqs from "../faqs.js";
import type * as files from "../files.js";
import type * as gallery from "../gallery.js";
import type * as messages from "../messages.js";
import type * as offers from "../offers.js";
import type * as posts from "../posts.js";
import type * as pricing from "../pricing.js";
import type * as reviews from "../reviews.js";
import type * as rooms from "../rooms.js";
import type * as seed from "../seed.js";
import type * as seedData from "../seedData.js";
import type * as seedInternal from "../seedInternal.js";
import type * as settings from "../settings.js";
import type * as stats from "../stats.js";
import type * as subscribers from "../subscribers.js";
import type * as users from "../users.js";
import type * as venues from "../venues.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bookings: typeof bookings;
  dining: typeof dining;
  directory: typeof directory;
  facilities: typeof facilities;
  faqs: typeof faqs;
  files: typeof files;
  gallery: typeof gallery;
  messages: typeof messages;
  offers: typeof offers;
  posts: typeof posts;
  pricing: typeof pricing;
  reviews: typeof reviews;
  rooms: typeof rooms;
  seed: typeof seed;
  seedData: typeof seedData;
  seedInternal: typeof seedInternal;
  settings: typeof settings;
  stats: typeof stats;
  subscribers: typeof subscribers;
  users: typeof users;
  venues: typeof venues;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
