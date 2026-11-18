// Pure money / currency helpers. Toman is the app currency; bank ledgers store Rial (1 Toman = 10 Rial).
export const toRial = (toman: number) => Math.round(toman * 10);
export const toToman = (rial: number) => rial / 10;
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** ((new - old) / old) * 100, rounded to 2 decimals; 0 when the old rate is not positive. */
export const percentChange = (oldRate: number, newRate: number) => (oldRate > 0 && newRate >= 0 ? round2(((newRate - oldRate) / oldRate) * 100) : 0);
/** Reverse calculation: the new exchange rate (whole toman) for a percentage change. */
export const rateFromPercent = (oldRate: number, pct: number) => (oldRate > 0 && Number.isFinite(pct) ? Math.round(oldRate * (1 + pct / 100)) : 0);
export type ChangeStatus = "increase" | "decrease" | "none";
export const changeStatus = (pct: number): ChangeStatus => (pct > 0 ? "increase" : pct < 0 ? "decrease" : "none");
/** Invoice total in Toman: Σ(qty × unitPrice − discount); negative for returns. */
export function invoiceTotal(items: { qty: number; unitPrice: number; discount?: number }[], type: "sale" | "return" = "sale") {
  const t = items.reduce((s, i) => s + Math.round(i.qty * i.unitPrice) - (i.discount ?? 0), 0);
  return type === "return" ? -t : t;
}
/** Derives the payment status from real paid/total amounts (never from a flag). */
export function paymentStatusOf(total: number, paid: number, type: "sale" | "return"): "paid" | "partial" | "unpaid" | "refunded" {
  const t = Math.abs(total); if (paid <= 0) return "unpaid"; if (paid >= t) return type === "sale" ? "paid" : "refunded"; return "partial";
}
