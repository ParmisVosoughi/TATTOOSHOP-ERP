import type { PackUnit, Product, Variant } from "@/api/types";
/** Variant-specific packs (with their own price) override same-named product units. */
export const mergeUnits = (base: PackUnit[], extra: PackUnit[]) => [...base.map((u) => extra.find((e) => e.name === u.name) ?? u), ...extra.filter((e) => !base.some((u) => u.name === e.name))];
export const unitsOf = (p: Product, v: Variant) => (v.extraUnits?.length ? mergeUnits(p.units, v.extraUnits) : p.units);
export const unitFactor = (p: Product, v: Variant, unit?: string) => { if (!unit) return 1; const u = unitsOf(p, v).find((x) => x.name === unit); if (!u) throw new Error(`واحد «${unit}» برای این کالا تعریف نشده است`); return u.factor; };
/** The pack object that keeps its own stock (independent inventory mode, pack with stock tracked), else null. */
export function ownPack(p: Product, v: Variant, unit?: string): PackUnit | null {
  if (p.inventoryMode !== "independent" || !unit) return null;
  const pack = v.extraUnits?.find((u) => u.name === unit) ?? p.units.find((u) => u.name === unit);
  return pack && pack.factor !== 1 && pack.stock !== undefined ? pack : null;
}
/** Adds `qty` (negative = remove) of `unit` to stock, converting packs to base units. Returns an undo function; throws when stock would go negative. */
export function applyStock(p: Product, v: Variant, unit: string | undefined, qty: number): () => void {
  const pack = ownPack(p, v, unit);
  if (pack) { const prev = pack.stock!; const next = prev + qty; if (next < 0) throw new Error(`موجودی «${unit}» کافی نیست`); pack.stock = next; return () => { pack.stock = prev; }; }
  const prev = v.stock; const next = prev + qty * unitFactor(p, v, unit);
  if (next < 0) throw new Error(`موجودی کافی نیست (موجودی: ${prev})`);
  v.stock = next; return () => { v.stock = prev; };
}
