import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./services";
import { mergeUnits } from "@/lib/inventory";
import type { CurrencyRate, PackUnit, Product, Variant } from "./types";

export const useApi = <R,>(key: string, fn: () => Promise<R>) => useQuery({ queryKey: [key], queryFn: fn });

export function useApiMutation<A, R>(fn: (a: A) => Promise<R>, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })) });
}

export const useProducts = () => useApi("products", api.products.list);
export const useRates = () => useApi("rates", api.rates.list);
export const useCategories = () => useApi("categories", api.categories.list);

/** Variant-specific packs (with their own price) override same-named product units. */
export { mergeUnits };
export type FlatVariant = Variant & { product: Product };
export function useFlatVariants() {
  const q = useProducts();
  const rows: FlatVariant[] = (q.data ?? []).flatMap((p) => p.variants.map((v) => ({ ...v, product: v.extraUnits?.length ? { ...p, units: mergeUnits(p.units, v.extraUnits) } : p })));
  return { ...q, rows };
}

/** Display-only conversion: selling price in its currency × current rate. Never overwrites stored prices. */
export function pricing(v: Variant, rates: CurrencyRate[] = []) {
  const rate = rates.find((r) => r.code === v.currency)?.rate ?? v.baseRate;
  const base = v.sellingPrice * v.baseRate;
  const adjusted = v.manualOverride ?? (v.locked ? base : v.sellingPrice * rate);
  const cost = v.purchasePrice * v.baseRate;
  return { base, adjusted, cost, change: base ? ((adjusted - base) / base) * 100 : 0, margin: cost ? ((adjusted - cost) / cost) * 100 : 0 };
}
export const variantLabel = (v: Variant) => Object.values(v.attributes).join(" · ") || v.sku;

/** Toman price of one pack of a variant: the pack's own price when set, otherwise unit price × factor. */
export function packPrice(v: Variant, unit: PackUnit | undefined, rates: CurrencyRate[] = []) {
  const p = pricing(v, rates);
  if (unit?.price && v.sellingPrice > 0) return Math.round(unit.price * (p.adjusted / v.sellingPrice));
  return Math.round(p.adjusted * (unit?.factor ?? 1));
}
