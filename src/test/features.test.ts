import { describe, expect, it } from "vitest";
import { groupDigits, matches, num, parseNum, toEnDigits } from "@/lib/format";
import { percentChange, rateFromPercent } from "@/lib/money";
import { jalaliInputToIso, isoToJalaliInput, toJalali } from "@/lib/jalali";
import { api } from "@/api/services";
import { packPrice, pricing } from "@/api/hooks";
import { matchesFilter } from "@/routes/invoices";
import type { SalesInvoice } from "@/api/types";

describe("number formatting", () => {
  it("groups digits in threes and normalises Persian digits", () => {
    expect(groupDigits("1234567")).toBe("1,234,567");
    expect(groupDigits("270000")).toBe("270,000");
    expect(groupDigits("38500000")).toBe("38,500,000");
    expect(num(2750000)).toBe("2,750,000");
    expect(groupDigits("-1234.5")).toBe("-1,234.5");
    expect(toEnDigits("۱۲٬۳۴۵")).toBe("12,345");
    expect(parseNum("275,000")).toBe(275000);
  });
});

describe("currency change (mock backend)", () => {
  it("saves the rate without touching base prices, then applies it to the prices", async () => {
    const before = (await api.products.list()).flatMap((p) => p.variants).find((v) => v.currency === "USD" && !v.locked)!;
    await api.rates.update("USD", 275000);
    const mid = (await api.products.list()).flatMap((p) => p.variants).find((v) => v.id === before.id)!;
    expect(mid.baseRate).toBe(before.baseRate);
    const rates = await api.rates.list();
    expect(pricing(mid, rates).adjusted).toBeCloseTo(mid.sellingPrice * 275000);
    await api.rates.apply("USD");
    const after = (await api.products.list()).flatMap((p) => p.variants).find((v) => v.id === before.id)!;
    expect(after.baseRate).toBe(275000);
    expect(pricing(after, rates).change).toBe(0);
  });
});

describe("products and codes", () => {
  it("auto-generates product SKU, variant SKU and barcode and keeps pack prices", async () => {
    const v = { id: "", productId: "", sku: "", barcode: "", attributes: {}, purchasePrice: 0, sellingPrice: 20000, currency: "IRT" as const, baseRate: 1, stock: 0, minStock: 0, locked: false, manualOverride: null, updatedAt: "", priceHistory: [], extraUnits: [{ name: "بسته ۲۰ عددی", factor: 20, price: 2000000 }] };
    const p = await api.products.save({ id: "", name: "رنگ تتلو", sku: "", brand: "x", categoryId: "c3", description: "", images: [], attributes: {}, inventoryMode: "shared", units: [{ name: "عدد", factor: 1 }], variants: [v] });
    expect(p.sku).toMatch(/^P\d+/);
    expect(p.variants[0]!.sku).toBe(`${p.sku}-1`);
    expect(p.variants[0]!.barcode).toMatch(/^626\d{10}$/);
    expect(packPrice(p.variants[0]!, p.variants[0]!.extraUnits![0], [])).toBe(2000000);
  });
});

describe("walk-in customer, invoices and accounts", () => {
  it("has the walk-in customer with code 920 and generates invoice codes", async () => {
    expect((await api.customers.list()).find((c) => c.id === "walkin")?.code).toBe("920");
    const s = await api.sales.create({ customerId: "walkin", items: [], total: 500000, type: "sale", paymentStatus: "paid", paidAmount: 500000, accountId: "a1", date: new Date().toISOString(), number: "INV-1" });
    expect(s.code).toMatch(/^F\d+/);
  });
  it("records cash received on an invoice in the cashbox ledger with date", async () => {
    const txs = await api.accounts.transactions("a1");
    expect(txs[0]).toMatchObject({ type: "deposit", amount: 5000000, code: "100" });
  });
  it("creates banks with unique 3-digit codes and posts same-day transactions", async () => {
    const b = await api.accounts.create({ name: "بانک تست" });
    expect(b.code).toMatch(/^\d{3}$/);
    await expect(api.accounts.create({ name: "تکراری", code: b.code! })).rejects.toThrow();
    await api.accounts.addTx(b.id, { type: "deposit", amount: 1000000, description: "x" });
    expect((await api.accounts.list()).find((a) => a.id === b.id)!.balance).toBe(100000);
    await api.accounts.setBalance("a1", 1);
    expect((await api.accounts.list()).find((a) => a.id === "a1")!.balance).toBe(1);
  });
  it("filters invoices by status", () => {
    const base = { id: "1", number: "n", code: "c", customerId: "k", date: "", items: [], total: 1, type: "sale" } as const;
    const inv = (o: Partial<SalesInvoice>) => ({ ...base, paymentStatus: "paid", ...o }) as SalesInvoice;
    expect(matchesFilter(inv({}), "paid")).toBe(true);
    expect(matchesFilter(inv({ paymentStatus: "unpaid" }), "unpaid")).toBe(true);
    expect(matchesFilter(inv({ archived: true }), "archived")).toBe(true);
    expect(matchesFilter(inv({ archived: true }), "paid")).toBe(false);
    expect(matchesFilter(inv({ type: "return", paymentStatus: "refunded" }), "returned")).toBe(true);
  });
});

describe("currency maths", () => {
  it("calculates percentage both ways", () => {
    expect(percentChange(270000, 275000)).toBe(1.85);
    expect(rateFromPercent(270000, 1.85)).toBe(274995);
    expect(percentChange(0, 5)).toBe(0);
  });
  it("applying the same currency change twice never compounds", async () => {
    await api.rates.update("USD", 300000);
    await api.rates.apply("USD"); await api.rates.apply("USD");
    const v = (await api.products.list()).flatMap((p) => p.variants).find((x) => x.currency === "USD" && !x.locked && x.manualOverride == null)!;
    expect(v.baseRate).toBe(300000);
    await expect(api.rates.update("USD", 0)).rejects.toThrow();
  });
});

describe("search & dates", () => {
  it("matches Persian/English words regardless of digit script", () => {
    expect(matches("کارتریج Kwadron 3RL", "kwad ۳rl")).toBe(true);
    expect(matches("کارتریج Kwadron", "xyz")).toBe(false);
  });
  it("converts Jalali dates", () => {
    expect(toJalali(2026, 11, 16)).toEqual({ jy: 1405, jm: 8, jd: 25 });
    expect(isoToJalaliInput(jalaliInputToIso("۱۴۰۵/۰۸/۲۵", "14:30")!)).toBe("1405/08/25");
    expect(jalaliInputToIso("1405/13/01", "")).toBeNull();
  });
});

describe("purchases, sales, inventory and ledgers are connected", () => {
  const variant = (o = {}) => ({ id: "", productId: "", sku: "", barcode: "", attributes: {}, purchasePrice: 0, sellingPrice: 1000, currency: "IRT" as const, baseRate: 1, stock: 0, minStock: 0, locked: false, manualOverride: null, updatedAt: "", priceHistory: [], extraUnits: [{ name: "بسته۲۰", factor: 20, price: 18000 }], ...o });
  const product = () => ({ id: "", name: "تست", sku: "", brand: "b", categoryId: "c3", description: "", images: [], attributes: {}, inventoryMode: "shared" as const, units: [{ name: "عدد", factor: 1 }], variants: [variant()] });
  const stock = async (id: string) => (await api.products.list()).flatMap((p) => p.variants).find((v) => v.id === id)!.stock;
  it("purchase raises stock, pays from cash, owes supplier and is not duplicated", async () => {
    const p = await api.products.save(product()); const vid = p.variants[0]!.id;
    const cash0 = (await api.accounts.list()).find((a) => a.id === "a2")!.balance; const sup0 = (await api.suppliers.list()).find((s) => s.id === "s3")!.balance;
    const input = { supplierId: "s3", date: "", currency: "IRT" as const, rate: 1, items: [{ variantId: vid, qty: 100, unitPrice: 500 }], shipping: 0, customs: 0, commission: 0, discount: 0, other: 0, total: 0, status: "received" as const, paidAmount: 20000, accountId: "a2", clientKey: "dup-1" };
    const a = await api.purchases.create(input); const b = await api.purchases.create(input);
    expect(b.id).toBe(a.id); expect(a.total).toBe(50000); expect(await stock(vid)).toBe(100);
    expect((await api.accounts.list()).find((x) => x.id === "a2")!.balance).toBe(cash0 - 20000);
    expect((await api.suppliers.list()).find((s) => s.id === "s3")!.balance).toBe(sup0 - 30000);
    expect((await api.movements.list())[0]).toMatchObject({ type: "in", qty: 100, ref: a.number });
  });
  it("sale converts packs to stock, tracks partial payments and void restores everything", async () => {
    const p = await api.products.save(product()); const vid = p.variants[0]!.id; await api.inventory.adjust({ variantId: vid, quantity: 100 });
    const item = { variantId: vid, unit: "بسته۲۰", qty: 2, unitPrice: 18000, discount: 0 };
    const s = await api.sales.create({ customerId: "walkin", date: "", items: [item], total: 0, type: "sale", paymentStatus: "partial", paidAmount: 10000, accountId: "a2" });
    expect(s).toMatchObject({ total: 36000, paidAmount: 10000, outstanding: 26000, paymentStatus: "partial" }); expect(await stock(vid)).toBe(60);
    await expect(api.sales.create({ customerId: "walkin", date: "", items: [{ ...item, qty: 99 }], total: 0, type: "sale", paymentStatus: "unpaid" })).rejects.toThrow(); expect(await stock(vid)).toBe(60);
    await expect(api.payments.sale(s.id, 30000, "a1")).rejects.toThrow();
    await api.payments.sale(s.id, 26000, "a1"); expect((await api.sales.list()).find((x) => x.id === s.id)).toMatchObject({ paymentStatus: "paid", outstanding: 0 });
    await api.payments.voidSale(s.id); expect(await stock(vid)).toBe(100);
    await expect(api.payments.voidSale(s.id)).rejects.toThrow();
  });
  it("ledger keeps chronological running balances, unique refs and rejects overdraws", async () => {
    const b = await api.accounts.create({ name: "بانک دفتر" });
    await api.accounts.addTx(b.id, { type: "deposit", amount: 1000000, description: "x" });
    const old = await api.accounts.addTx(b.id, { type: "deposit", amount: 500000, description: "قدیمی", date: new Date(Date.now() - 40 * 864e5).toISOString() });
    const txs = await api.accounts.transactions(b.id);
    expect(txs[0]!.balanceAfter).toBe(150000); expect(txs[1]!.balanceAfter).toBe(50000); // newest first, running balance recomputed chronologically
    await expect(api.accounts.addTx(b.id, { type: "withdraw", amount: 9e12, description: "" })).rejects.toThrow();
    await expect(api.accounts.addTx(b.id, { type: "deposit", amount: 1, description: "", ref: old.ref })).rejects.toThrow();
  });
});
