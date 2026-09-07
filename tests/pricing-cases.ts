/**
 * The stays both pricing implementations must agree on.
 *
 * Pentagon prices a stay twice: in the browser, so the booking summary updates
 * as the guest types (`lib/booking.ts` in the website repo), and on the server,
 * which decides what is actually charged (`convex/pricing.ts` here). Two repos,
 * no shared package — so nothing but discipline keeps the two in step, and a
 * silent divergence shows up as a guest at the desk holding a screenshot of a
 * different number.
 *
 * This file is the discipline. It is duplicated **byte for byte** in both
 * repos, at `tests/pricing-cases.ts`, and each repo's test runs its own
 * implementation over these cases and asserts the totals below. The expected
 * figures are written out by hand rather than computed, so a change to the
 * order of operations or to the rounding fails here instead of reaching a
 * guest.
 *
 * If you change the pricing rules: update this file, copy it to the other repo,
 * and make both suites pass.
 */

export interface PricingCase {
  name: string;
  rate: number;
  nights: number;
  roomCount: number;
  extras: { price: number; unit: "stay" | "night" }[];
  /** 0–1. The website resolves this from a validated promo code. */
  discountRate: number;
  vatRate: number;
  serviceRate: number;
  expected: {
    roomSubtotal: number;
    extrasSubtotal: number;
    discount: number;
    vat: number;
    serviceCharge: number;
    total: number;
  };
}

const VAT = 0.075;
const SERVICE = 0.05;

export const pricingCases: PricingCase[] = [
  {
    name: "one night, no extras, no promo",
    rate: 85_000,
    nights: 1,
    roomCount: 1,
    extras: [],
    discountRate: 0,
    vatRate: VAT,
    serviceRate: SERVICE,
    expected: {
      roomSubtotal: 85_000,
      extrasSubtotal: 0,
      discount: 0,
      vat: 6_375,
      serviceCharge: 4_250,
      total: 95_625,
    },
  },
  {
    name: "three nights, two rooms",
    rate: 85_000,
    nights: 3,
    roomCount: 2,
    extras: [],
    discountRate: 0,
    vatRate: VAT,
    serviceRate: SERVICE,
    expected: {
      roomSubtotal: 510_000,
      extrasSubtotal: 0,
      discount: 0,
      vat: 38_250,
      serviceCharge: 25_500,
      total: 573_750,
    },
  },
  {
    // A per-night extra must multiply by nights; a per-stay one must not.
    name: "mixed extras — breakfast per night, transfer per stay",
    rate: 85_000,
    nights: 3,
    roomCount: 1,
    extras: [
      { price: 7_500, unit: "night" },
      { price: 25_000, unit: "stay" },
    ],
    discountRate: 0,
    vatRate: VAT,
    serviceRate: SERVICE,
    expected: {
      roomSubtotal: 255_000,
      extrasSubtotal: 47_500,
      discount: 0,
      vat: 22_688,
      serviceCharge: 15_125,
      total: 340_313,
    },
  },
  {
    // The discount comes off accommodation only — extras and tax are untouched.
    name: "promo discounts the room but not the extras",
    rate: 85_000,
    nights: 2,
    roomCount: 1,
    extras: [{ price: 7_500, unit: "night" }],
    discountRate: 0.15,
    vatRate: VAT,
    serviceRate: SERVICE,
    expected: {
      roomSubtotal: 170_000,
      extrasSubtotal: 15_000,
      discount: 25_500,
      vat: 11_963,
      serviceCharge: 7_975,
      total: 179_438,
    },
  },
  {
    // Rates are the dashboard's to set: the arithmetic must follow them.
    name: "dashboard rates changed to 10% VAT and no service charge",
    rate: 85_000,
    nights: 2,
    roomCount: 1,
    extras: [],
    discountRate: 0,
    vatRate: 0.1,
    serviceRate: 0,
    expected: {
      roomSubtotal: 170_000,
      extrasSubtotal: 0,
      discount: 0,
      vat: 17_000,
      serviceCharge: 0,
      total: 187_000,
    },
  },
  {
    // A rate that does not divide cleanly, to pin the rounding down.
    name: "odd rate, rounding",
    rate: 47_333,
    nights: 3,
    roomCount: 1,
    extras: [{ price: 3_333, unit: "stay" }],
    discountRate: 0.1,
    vatRate: VAT,
    serviceRate: SERVICE,
    expected: {
      roomSubtotal: 141_999,
      extrasSubtotal: 3_333,
      discount: 14_200,
      vat: 9_835,
      serviceCharge: 6_557,
      total: 147_524,
    },
  },
  {
    name: "no tax at all",
    rate: 60_000,
    nights: 1,
    roomCount: 1,
    extras: [],
    discountRate: 0,
    vatRate: 0,
    serviceRate: 0,
    expected: {
      roomSubtotal: 60_000,
      extrasSubtotal: 0,
      discount: 0,
      vat: 0,
      serviceCharge: 0,
      total: 60_000,
    },
  },
];
