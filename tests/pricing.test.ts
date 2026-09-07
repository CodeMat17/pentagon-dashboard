import { describe, expect, it } from "vitest";

import { priceStay } from "../convex/pricing";
import { pricingCases } from "./pricing-cases";

/**
 * The server's half of the pricing agreement — see `pricing-cases.ts` for why
 * these cases exist and what to do when the rules change.
 *
 * `priceStay` is the arithmetic with the database left out, which is the part
 * that has to match the website exactly. The reads around it (which room, which
 * extras, which promo) are covered by exercising the booking flow itself.
 */
describe("priceStay", () => {
  for (const stay of pricingCases) {
    it(stay.name, () => {
      expect(
        priceStay({
          rate: stay.rate,
          nights: stay.nights,
          roomCount: stay.roomCount,
          extras: stay.extras,
          discountRate: stay.discountRate,
          vatRate: stay.vatRate,
          serviceRate: stay.serviceRate,
        }),
      ).toEqual(stay.expected);
    });
  }
});
