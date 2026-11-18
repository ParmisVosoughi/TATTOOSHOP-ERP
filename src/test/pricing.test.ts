import { describe, expect, it } from "vitest";
import { pricing } from "@/api/hooks";
import type { CurrencyRate, Variant } from "@/api/types";

const variant: Variant = {
  id: "v1", productId: "p1", sku: "TEST", barcode: "", attributes: {},
  purchasePrice: 8, sellingPrice: 14, currency: "USD", baseRate: 89500,
  stock: 20, minStock: 5, locked: false, manualOverride: null,
  updatedAt: "2026-11-15T00:00:00Z", priceHistory: [{ date: "2026-11-14T00:00:00Z", price: 14 }],
};
const rates: CurrencyRate[] = [{
  code: "USD", name: "USD", rate: 92000, previousRate: 89500,
  updatedAt: "2026-11-15T00:00:00Z", history: [],
}];

describe("Display-only pricing", () => {
  it("uses the current rate without overwriting original prices or history", () => {
    const original = structuredClone(variant);
    expect(pricing(variant, rates)).toMatchObject({ base: 1253000, adjusted: 1288000, cost: 716000 });
    expect(variant).toEqual(original);
  });

  it("keeps a locked price at its original exchange rate", () => {
    expect(pricing({ ...variant, locked: true }, rates).adjusted).toBe(1253000);
  });

  it("uses the backend manual override in Toman when present", () => {
    expect(pricing({ ...variant, manualOverride: 1300000 }, rates).adjusted).toBe(1300000);
  });
});