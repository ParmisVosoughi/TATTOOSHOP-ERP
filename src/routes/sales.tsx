import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, SearchSelect, Select, Stat } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, packPrice, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { toman, page, today } from "@/lib/format";
import { invoiceTotal } from "@/lib/money";
import { newKey } from "@/lib/ids";

export const Route = createFileRoute("/sales")({ head: page("فروش", "ثبت فاکتور فروش و مرجوعی"), component: Page });
function Page() {
  const { data: cus = [], isLoading: customersLoading } = useApi("customers", api.customers.list); const { rows, isLoading: productsLoading } = useFlatVariants(); const { data: rates, isLoading: ratesLoading } = useRates();
  const create = useApiMutation(api.sales.create, ["sales", "products", "movements", "dashboard", "accounting", "customers", "accounts", "accountTx"]);
  const WALKIN = "walkin"; const [customerId, setC] = useState(""); const [type, setType] = useState<T.SalesInvoice["type"]>("sale"); const [status, setStatus] = useState<T.SalesInvoice["paymentStatus"]>("paid");
  const [items, setItems] = useState<T.SaleItem[]>([]); const [paid, setPaid] = useState(0);
  const up = (i: number, p: Partial<T.SaleItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const unitPrice = (vid: string, unit: string) => { const r = rows.find((x) => x.id === vid); return r ? packPrice(r, r.product.units.find((u) => u.name === unit), rates) : 0; };
  const { data: accs = [] } = useApi("accounts", api.accounts.list); const [accountId, setAccountId] = useState("");
  const variantOpts = rows.map((x) => ({ value: x.id, label: `${x.product.name} · ${variantLabel(x)} · ${x.sku}`, search: `${x.product.brand} ${x.barcode}` }));
  const key = useRef(newKey()); // prevents duplicate submission of the same form
  const total = invoiceTotal(items, type);
  const selectedCustomerId = customerId || WALKIN;
  const payAccount = accountId || accs.find((a) => a.type === "cash")?.id || accs[0]?.id || "";
  if (customersLoading || productsLoading || ratesLoading) return <Loading />;
  return <><PageHeader title="فاکتور فروش جدید" />
    <Card>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="مشتری"><SearchSelect value={selectedCustomerId} onChange={setC} options={cus.filter((c) => c.id !== WALKIN).map((c) => ({ value: c.id, label: c.name }))} pinned={[{ value: WALKIN, label: "مشتری گذری (کد ۹۲۰)" }]} /></Field>
        <Field label="نوع"><Select value={type} onChange={(e) => setType(e.target.value as T.SalesInvoice["type"])}><option value="sale">فروش</option><option value="return">مرجوعی / استرداد</option></Select></Field>
        <Field label="وضعیت پرداخت"><Select value={status} onChange={(e) => setStatus(e.target.value as T.SalesInvoice["paymentStatus"])}><option value="paid">پرداخت شده</option><option value="partial">پرداخت جزئی</option><option value="unpaid">پرداخت نشده</option><option value="refunded">مسترد شده</option></Select></Field>
        {status === "partial" && <Field label="مبلغ پرداختی (تومان)"><Input type="number" value={paid || ""} onChange={(e) => setPaid(+e.target.value)} /></Field>}
        {(status === "paid" || status === "partial" || status === "refunded") && <Field label="دریافت/پرداخت وجه در (صندوق / بانک)"><SearchSelect value={payAccount} onChange={setAccountId} options={accs.map((a) => ({ value: a.id, label: a.name }))} /></Field>}
      </div>
      <div className="mt-3 space-y-1.5">{items.map((it, i) => { const r = rows.find((x) => x.id === it.variantId); return <div key={i} className="flex flex-wrap gap-1.5">
        <SearchSelect ariaLabel="کالا" className="min-w-60 flex-1" value={it.variantId} onChange={(v) => { if (!v) return; const nr = rows.find((x) => x.id === v); const unit = nr?.product.units[0]?.name ?? ""; up(i, { variantId: v, unit, unitPrice: unitPrice(v, unit) }); }} options={variantOpts} />
        <Select className="w-28" value={it.unit} onChange={(e) => up(i, { unit: e.target.value, unitPrice: unitPrice(it.variantId, e.target.value) })}>{r?.product.units.map((u) => <option key={u.name}>{u.name}</option>)}</Select>
        <Input type="number" className="w-20" aria-label="تعداد" value={it.qty} onChange={(e) => up(i, { qty: +e.target.value })} />
        <Input type="number" className="w-32" value={it.unitPrice} onChange={(e) => up(i, { unitPrice: +e.target.value })} />
        <Input type="number" className="w-28" placeholder="تخفیف" value={it.discount} onChange={(e) => up(i, { discount: +e.target.value })} />
        <Button variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</Button></div>; })}
        <Button size="sm" variant="outline" onClick={() => { const r = rows[0]; if (r) { const unit = r.product.units[0]?.name ?? ""; setItems([...items, { variantId: r.id, unit, qty: 1, unitPrice: unitPrice(r.id, unit), discount: 0 }]); } }}>+ افزودن کالا</Button></div>
      <div className="mt-3 flex items-center justify-between border-t pt-3"><b>جمع نهایی: {toman(total)}</b>
        <Button disabled={!items.length || !selectedCustomerId || create.isPending} onClick={() => create.mutate({ customerId: selectedCustomerId, items, total, type, paymentStatus: status, paidAmount: status === "partial" ? paid : status === "paid" ? Math.abs(total) : undefined, accountId: status === "paid" || status === "partial" || status === "refunded" ? payAccount : undefined, date: today(), clientKey: key.current }, { onSuccess: () => { setItems([]); setPaid(0); key.current = newKey(); toast.success("فاکتور ثبت شد"); }, onError: (e) => toast.error(e.message) })}>ثبت فاکتور</Button></div>
    </Card></>;
}
