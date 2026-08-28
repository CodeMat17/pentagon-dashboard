import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Every image is stored denormalised: the storage id (so the file can be deleted
 * along with the row) *and* the resolved URL (so no read path has to await
 * `ctx.storage.getUrl`). Convex storage URLs are stable for the life of the file.
 */
export const image = v.object({
  storageId: v.id("_storage"),
  url: v.string(),
  alt: v.string(),
});

export const bedType = v.union(
  v.literal("King"),
  v.literal("Queen"),
  v.literal("Twin"),
  v.literal("Double"),
);

export const roomCategory = v.union(
  v.literal("Standard"),
  v.literal("Deluxe"),
  v.literal("Executive"),
  v.literal("Suite"),
  v.literal("Family"),
);

export const role = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("editor"),
  v.literal("viewer"),
);

export default defineSchema({
  /* ------------------------------------------------------------------ staff */

  /**
   * One row per Clerk user who has opened the dashboard. Convex is the
   * authorization layer: Clerk says who you are, this table says what you may do.
   */
  users: defineTable({
    subject: v.string(), // Clerk user id, from the JWT `sub` claim
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role,
    active: v.boolean(),
    lastSeenAt: v.number(),
  })
    .index("by_subject", ["subject"])
    .index("by_email", ["email"]),

  /* ---------------------------------------------------------------- content */

  rooms: defineTable({
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
  })
    .index("by_slug", ["slug"])
    .index("by_published_order", ["published", "order"]),

  facilityGroups: defineTable({
    category: v.string(),
    blurb: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        icon: v.string(),
        hours: v.optional(v.string()),
      }),
    ),
    order: v.number(),
  }).index("by_order", ["order"]),

  diningVenues: defineTable({
    slug: v.string(),
    name: v.string(),
    cuisine: v.string(),
    blurb: v.string(),
    description: v.string(),
    hours: v.string(),
    dressCode: v.string(),
    capacity: v.number(),
    image,
    highlights: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        price: v.number(),
      }),
    ),
    order: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  venues: defineTable({
    slug: v.string(),
    name: v.string(),
    blurb: v.string(),
    description: v.string(),
    areaSqm: v.number(),
    dimensions: v.string(),
    capacities: v.array(v.object({ layout: v.string(), seats: v.number() })),
    equipment: v.array(v.string()),
    image,
    fromRate: v.number(),
    order: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  offers: defineTable({
    slug: v.string(),
    title: v.string(),
    blurb: v.string(),
    description: v.string(),
    validity: v.string(),
    inclusions: v.array(v.string()),
    terms: v.string(),
    discountLabel: v.string(),
    fromRate: v.number(),
    image,
    code: v.string(),
    order: v.number(),
    published: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_published_order", ["published", "order"]),

  extraServices: defineTable({
    key: v.string(), // stable id the booking flow stores against a reservation
    name: v.string(),
    description: v.string(),
    price: v.number(),
    unit: v.union(v.literal("stay"), v.literal("night")),
    icon: v.string(),
    order: v.number(),
    active: v.boolean(),
  })
    .index("by_key", ["key"])
    .index("by_active_order", ["active", "order"]),

  promoCodes: defineTable({
    code: v.string(), // always upper-cased on write
    discount: v.number(), // 0–1
    label: v.string(),
    active: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["active"]),

  reviews: defineTable({
    author: v.string(),
    rating: v.number(),
    date: v.string(), // ISO yyyy-mm-dd
    source: v.string(),
    title: v.string(),
    body: v.string(),
    stayType: v.string(),
    published: v.boolean(),
    order: v.number(),
  }).index("by_published_order", ["published", "order"]),

  attractions: defineTable({
    name: v.string(),
    category: v.string(),
    distanceKm: v.number(),
    minutes: v.number(),
    note: v.string(),
    order: v.number(),
  }).index("by_order", ["order"]),

  guestServices: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    availability: v.string(),
    order: v.number(),
  }).index("by_order", ["order"]),

  faqs: defineTable({
    category: v.string(),
    question: v.string(),
    answer: v.string(),
    order: v.number(),
    published: v.boolean(),
  })
    .index("by_published_order", ["published", "order"])
    .index("by_category", ["category", "order"]),

  galleryImages: defineTable({
    image,
    category: v.string(),
    tall: v.boolean(),
    order: v.number(),
  })
    .index("by_order", ["order"])
    .index("by_category", ["category", "order"]),

  posts: defineTable({
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    date: v.string(),
    tag: v.string(),
    readMinutes: v.number(),
    image,
    body: v.array(v.string()),
    published: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_published_date", ["published", "date"]),

  /* --------------------------------------------------------------- inbound */

  bookings: defineTable({
    reference: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("checked-in"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    roomSlug: v.string(),
    roomName: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
    nights: v.number(),
    adults: v.number(),
    children: v.number(),
    roomCount: v.number(),
    extras: v.array(v.string()),
    promoCode: v.union(v.string(), v.null()),
    guest: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.string(),
      country: v.string(),
      specialRequests: v.string(),
      arrivalTime: v.string(),
    }),
    total: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_reference", ["reference"])
    .index("by_status", ["status"])
    .index("by_checkIn", ["checkIn"]),

  messages: defineTable({
    kind: v.union(
      v.literal("contact"),
      v.literal("event-quote"),
      v.literal("table-reservation"),
    ),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    subject: v.string(),
    body: v.string(),
    /** Kind-specific extras, rendered as a definition list in the dashboard. */
    details: v.array(v.object({ label: v.string(), value: v.string() })),
    status: v.union(v.literal("new"), v.literal("read"), v.literal("archived")),
  })
    .index("by_status", ["status"])
    .index("by_kind", ["kind"]),

  subscribers: defineTable({
    email: v.string(),
    status: v.union(v.literal("subscribed"), v.literal("unsubscribed")),
    source: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  /* -------------------------------------------------------------- settings */

  settings: defineTable({
    key: v.literal("site"),
    phone: v.string(),
    whatsapp: v.string(),
    email: v.string(),
    reservationsEmail: v.string(),
    address: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
    vatRate: v.number(),
    serviceRate: v.number(),
    announcement: v.string(),
    announcementActive: v.boolean(),
    bookingsOpen: v.boolean(),
  }).index("by_key", ["key"]),
});
