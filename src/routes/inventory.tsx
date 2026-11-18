import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, SearchSelect, Select, Stat, type Tone } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, pricing, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, num, pct, toman, page, today } from "@/lib/format";

export const Route = createFileRoute("/inventory")({ head: page("انبار", "موجودی هر تنوع و گردش کالا"), component: Page });
function Page() {
  const { rows, isLoading } = useFlatVariants(); const { data: mv = [] } = useApi("movements", api.movements.list);
  const op = useApiMutation((fn: () => Promise<void>) => fn(), ["products", "movements", "dashboard", "accounting", "accounts"]);
  const { data: whs = [] } = useApi("warehouses", api.warehouses.list);
  const [o, setO] = useState({ variantId: "", unit: "", toUnit: "", qty: 0, note: "", from: "", to: "" });
  if (isLoading) return <Loading />;
  const vid = o.variantId || rows[0]?.id || ""; const cur = rows.find((r) => r.id === vid); const units = cur?.product.units ?? [];
  const run = (fn: () => Promise<void>, msg: string) => op.mutate(fn, { onSuccess: () => { setO({ ...o, qty: 0 }); toast.success(msg); }, onError: (e) => toast.error(e.message) });
  const label = (id: string) => { const r = rows.find((x) => x.id === id); return r ? `${r.product.name} · ${variantLabel(r)}` : id; };
  const types: Record<T.StockMovement["type"], [string, Tone]> = { in: ["ورود", "success"], out: ["خروج", "danger"], transfer: ["انتقال", "primary"], convert: ["تبدیل واحد", "warning"], return: ["مرجوعی", "neutral"] };
  return <><PageHeader title="انبار" subtitle="موجودی به واحد پایه؛ در حالت مشترک فروش بسته به‌طور خودکار از واحد پایه کسر می‌شود." />
    <Card title="عملیات انبار" className="mb-4"><div className="grid gap-2 sm:grid-cols-6">
      <Field label="کالا" className="sm:col-span-2"><SearchSelect ariaLabel="کالا" value={vid} onChange={(v) => v && setO({ ...o, variantId: v, unit: "", toUnit: "" })} options={rows.map((r) => ({ value: r.id, label: `${label(r.id)} · ${r.sku}`, search: `${r.product.brand} ${r.barcode}` }))} /></Field>
      <Field label="واحد"><Select value={o.unit || units[0]?.name} onChange={(e) => setO({ ...o, unit: e.target.value })}>{units.map((u) => <option key={u.name}>{u.name}</option>)}</Select></Field>
      <Field label="به واحد (تبدیل)"><Select value={o.toUnit || units[1]?.name || units[0]?.name} onChange={(e) => setO({ ...o, toUnit: e.target.value })}>{units.map((u) => <option key={u.name}>{u.name}</option>)}</Select></Field>
      <Field label="مقدار (برای کاهش منفی)"><Input type="number" value={o.qty} onChange={(e) => setO({ ...o, qty: +e.target.value })} /></Field>
      <Field label="توضیح"><Input value={o.note} onChange={(e) => setO({ ...o, note: e.target.value })} /></Field>
      {whs.length > 1 && <><Field label="انبار مبدا"><Select value={o.from || whs[0].id} onChange={(e) => setO({ ...o, from: e.target.value })}>{whs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
      <Field label="انبار مقصد"><Select value={o.to || whs[1].id} onChange={(e) => setO({ ...o, to: e.target.value })}>{whs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field></>}
    </div><div className="mt-3 flex gap-2">
      <Button disabled={!o.qty || op.isPending} onClick={() => run(() => api.inventory.adjust({ variantId: vid, quantity: o.qty, unit: o.unit || units[0]?.name, note: o.note }), "موجودی تعدیل شد")}>ثبت تعدیل موجودی</Button>
      <Button variant="outline" disabled={!o.qty || o.qty < 0 || op.isPending || cur?.product.inventoryMode !== "independent"} onClick={() => run(() => api.inventory.convert({ variantId: vid, fromUnit: o.unit || units[0]?.name, toUnit: o.toUnit || units[1]?.name || units[0]?.name, quantity: o.qty }), "واحد تبدیل شد")}>تبدیل واحد</Button>
      {whs.length > 1 && <Button variant="outline" disabled={!o.qty || o.qty < 0 || op.isPending} onClick={() => run(() => api.inventory.transfer({ variantId: vid, unit: o.unit || units[0]?.name, quantity: o.qty, fromWarehouseId: o.from || whs[0].id, toWarehouseId: o.to || whs[1].id }), "انتقال ثبت شد")}>انتقال بین انبارها</Button>}
    </div></Card>
    <DataTable rows={rows} getId={(r) => r.id} search={(r) => `${r.sku} ${r.barcode} ${r.product.name} ${r.product.brand} ${variantLabel(r)}`} columns={[
      { key: "p", header: "کالا", cell: (r) => label(r.id), sort: (r) => r.product.name }, { key: "s", header: "SKU", cell: (r) => r.sku },
      { key: "m", header: "حالت", cell: (r) => r.product.inventoryMode === "shared" ? "مشترک" : "مستقل" },
      { key: "q", header: "موجودی", cell: (r) => <Badge tone={r.stock === 0 ? "danger" : r.stock <= r.minStock ? "warning" : "success"}>{num(r.stock)} {r.product.units[0]?.name}</Badge>, sort: (r) => r.stock },
      { key: "u", header: "معادل بسته‌بندی", cell: (r) => <span className="text-xs">{r.product.units.slice(1).map((u) => `${num(Math.floor(r.stock / u.factor))} ${u.name}`).join("، ")}</span> },
    ]} />
    <h2 className="mb-2 mt-6 font-semibold">گردش کالا</h2>
    <DataTable rows={mv} getId={(r) => r.id} search={(r) => r.ref} columns={[
      { key: "d", header: "تاریخ", cell: (r) => jdate(r.date), sort: (r) => r.date }, { key: "t", header: "نوع", cell: (r) => <Badge tone={types[r.type][1]}>{types[r.type][0]}</Badge> },
      { key: "v", header: "کالا", cell: (r) => label(r.variantId) }, { key: "q", header: "مقدار", cell: (r) => `${num(r.qty)} ${r.unit}` }, { key: "r", header: "مرجع", cell: (r) => <span>{r.ref}{r.note ? <span className="ms-1 text-xs text-muted-foreground">({r.note})</span> : null}</span> },
    ]} /></>;
}
