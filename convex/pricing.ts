import { v } from "convex/values";

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAdmin, requireEditor } from "./auth";

/**
 * The two levers that change what a guest pays: bookable extras, and promo codes.
 *
 * `validatePromo` is deliberately the only way the website learns a discount —
 * the codes themselves are never shipped to the browser, so an inactive or
 * mistyped code fails server-side rather than being guessable from the bundle.
 */

/* ----------------------------------------------------------------- extras */

const extraFields = {
  key: v.string(),
  name: v.string(),
  description: v.string(),
  price: v.number(),
  unit: v.union(v.literal("stay"), v.literal("night")),
  icon: v.string(),
  order: v.number(),
  active: v.boolean(),
};

/** Public. Only the extras a guest can actually add. */
export const extras = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("extraServices")
      .withIndex("by_active_order", (q) => q.eq("active", true))
      .collect(),
});

/** Dashboard. */
export const allExtras = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("extraServices").withIndex("by_key").collect(),
});

export const createExtra = mutation({
  args: extraFields,
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const clash = await ctx.db
      .query("extraServices")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (clash) throw new Error(`An extra already uses the key "${args.key}".`);
    return await ctx.db.insert("extraServices", args);
  },
});

export const updateExtra = mutation({
  args: { id: v.id("extraServices"), ...extraFields },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    await ctx.db.patch(id, patch);
  },
});

export const removeExtra = mutation({
  args: { id: v.id("extraServices") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});

/* ------------------------------------------------------------ promo codes */

/** Public. Validates one code; returns nothing useful for a wrong guess. */
export const validatePromo = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({ valid: v.literal(true), discount: v.number(), label: v.string() }),
    v.object({ valid: v.literal(false) }),
  ),
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    if (!code) return { valid: false as const };
    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!promo || !promo.active) return { valid: false as const };
    return { valid: true as const, discount: promo.discount, label: promo.label };
  },
});

/** Dashboard only — the full list never reaches the public site. */
export const allPromos = query({
  args: {},
  handler: async (ctx) => {
    await requireEditor(ctx);
    return await ctx.db.query("promoCodes").withIndex("by_code").collect();
  },
});

export const createPromo = mutation({
  args: {
    code: v.string(),
    discount: v.number(),
    label: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const code = args.code.trim().toUpperCase();
    if (args.discount <= 0 || args.discount >= 1) {
      throw new Error("Discount must be between 0 and 1 (0.15 = 15% off).");
    }
    const clash = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (clash) throw new Error(`The code ${code} already exists.`);
    return await ctx.db.insert("promoCodes", { ...args, code });
  },
});

export const updatePromo = mutation({
  args: {
    id: v.id("promoCodes"),
    code: v.string(),
    discount: v.number(),
    label: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireEditor(ctx);
    if (patch.discount <= 0 || patch.discount >= 1) {
      throw new Error("Discount must be between 0 and 1 (0.15 = 15% off).");
    }
    await ctx.db.patch(id, { ...patch, code: patch.code.trim().toUpperCase() });
  },
});

export const removePromo = mutation({
  args: { id: v.id("promoCodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/* --------------------------------------------------------- the house quote */

/**
 * What a stay costs, decided here rather than in the browser.
 *
 * The booking flow prices a stay client-side so the summary updates as the
 * guest types, but that number is an estimate the guest's own machine produced:
 * it can be stale (the rates moved while the tab was open), or simply invented.
 * `quoteStay` recomputes it from the room, extras, promo and tax rates as they
 * are *now*, and that is the figure written to the reservation, sent in the
 * confirmation and counted in the dashboard's revenue.
 *
 * The arithmetic mirrors `calculatePrice` in the website's `lib/booking.ts`,
 * rounding included — the two must agree or every booking looks like a
 * mismatch. Change one, change the other.
 */

const FALLBACK_VAT = 0.075;
const FALLBACK_SERVICE = 0.05;

export interface Quote {
  /** Derived from the dates, not taken from the client. */
  nights: number;
  /** The room's name as it reads today, for the confirmation. */
  roomName: string;
  roomSubtotal: number;
  extrasSubtotal: number;
  discount: number;
  discountLabel: string | null;
  vat: number;
  serviceCharge: number;
  total: number;
}

export interface PricedExtra {
  price: number;
  unit: "stay" | "night";
}

/**
 * The arithmetic itself, with the database left out — every input already
 * resolved to a number.
 *
 * Split out from `quoteStay` so it can be tested directly against the same
 * cases as the website's `calculatePrice`: the shared fixture in
 * `tests/pricing-cases.ts` is duplicated in both repos, so a change to the
 * order of operations or the rounding here fails a test rather than quietly
 * disagreeing with what the guest was shown.
 */
export function priceStay(input: {
  rate: number;
  nights: number;
  roomCount: number;
  extras: PricedExtra[];
  /** 0–1, already proved against an active promo code. */
  discountRate: number;
  vatRate: number;
  serviceRate: number;
}): {
  roomSubtotal: number;
  extrasSubtotal: number;
  discount: number;
  vat: number;
  serviceCharge: number;
  total: number;
} {
  const roomSubtotal = input.rate * input.nights * input.roomCount;

  const extrasSubtotal = input.extras.reduce(
    (sum, extra) =>
      sum + (extra.unit === "night" ? extra.price * input.nights : extra.price),
    0,
  );

  // Promotions apply to accommodation only — never to extras or tax.
  const discount = Math.round(roomSubtotal * input.discountRate);

  const taxable = roomSubtotal - discount + extrasSubtotal;
  const vat = Math.round(taxable * input.vatRate);
  const serviceCharge = Math.round(taxable * input.serviceRate);

  return {
    roomSubtotal,
    extrasSubtotal,
    discount,
    vat,
    serviceCharge,
    total: taxable + vat + serviceCharge,
  };
}

/** Whole nights between two `yyyy-mm-dd` dates. */
function nightsBetween(checkIn: string, checkOut: string): number {
  const from = Date.parse(`${checkIn}T00:00:00Z`);
  const to = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/** A rate is only honoured when it is a real fraction; `settings.save` already
 *  enforces that, so this only guards a malformed or half-migrated row. */
function fraction(rate: number | undefined, fallback: number): number {
  return typeof rate === "number" && Number.isFinite(rate) && rate >= 0 && rate <= 1
    ? rate
    : fallback;
}

export async function quoteStay(
  ctx: QueryCtx | MutationCtx,
  input: {
    roomSlug: string;
    checkIn: string;
    checkOut: string;
    roomCount: number;
    extras: string[];
    promoCode: string | null;
  },
): Promise<Quote> {
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_slug", (q) => q.eq("slug", input.roomSlug))
    .unique();
  if (!room || !room.published) {
    throw new Error("That room is no longer available to book online.");
  }

  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights <= 0) throw new Error("Check-out must be after check-in.");
  const roomCount = Math.max(1, Math.floor(input.roomCount));

  /*
   * An extra that has since been deactivated or deleted is skipped rather than
   * refused: the guest asked for something the hotel no longer sells, which the
   * desk can sort out — it is not a reason to lose the reservation.
   */
  const extras: PricedExtra[] = [];
  for (const key of input.extras) {
    const extra = await ctx.db
      .query("extraServices")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!extra || !extra.active) continue;
    extras.push({ price: extra.price, unit: extra.unit });
  }

  /*
   * The discount is re-read from the code, never taken from the client — until
   * now `validatePromo` proved a code was real while the browser was free to
   * apply whatever discount it liked.
   */
  let discountRate = 0;
  let discountLabel: string | null = null;
  const code = input.promoCode?.trim().toUpperCase();
  if (code) {
    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (promo?.active) {
      discountRate = promo.discount;
      discountLabel = promo.label;
    }
  }

  const settings = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "site"))
    .unique();

  return {
    nights,
    roomName: room.name,
    discountLabel,
    ...priceStay({
      rate: room.rate,
      nights,
      roomCount,
      extras,
      discountRate,
      vatRate: fraction(settings?.vatRate, FALLBACK_VAT),
      serviceRate: fraction(settings?.serviceRate, FALLBACK_SERVICE),
    }),
  };
}
