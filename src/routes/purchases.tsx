import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Button, Card, Field, Input, Loading, PageHeader, SearchSelect } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, num, toman, page, today } from "@/lib/format";
import { newKey } from "@/lib/ids";

export const Route = createFileRoute("/purchases")({ head: page("خرید", "ثبت فاکتور خرید و محاسبه بهای تمام‌شده"), component: Page });
const blankForm = { supplierId: "", currency: "USD" as T.CurrencyCode, rate: 0, shipping: 0, customs: 0, commission: 0, discount: 0, other: 0 };
function Page() {
  const { data = [] } = useApi("purchases", api.purchases.list); const { data: sup = [], isLoading: suppliersLoading } = useApi("suppliers", api.suppliers.list);
  const { data: accs = [] } = useApi("accounts", api.accounts.list);
  const { rows, isLoading: productsLoading } = useFlatVariants(); const { data: rates = [], isLoading: ratesLoading } = useRates();
  const create = useApiMutation(api.purchases.create, ["purchases", "products", "movements", "dashboard", "accounting", "suppliers", "accounts", "accountTx"]);
  const [f, setF] = useState(blankForm);
  const [items, setItems] = useState<T.PurchaseItem[]>([]); const [paid, setPaid] = useState(0); const [accountId, setAccountId] = useState("");
  const key = useRef(newKey()); // one key per invoice form: re-submitting the same form can never register it twice
  const rate = f.rate || rates.find((r) => r.code === f.currency)?.rate || 1;
  const sub = items.reduce((s, i) => s + i.qty * i.unitPrice, 0) * rate;
  const total = Math.round(sub + f.shipping + f.customs + f.commission + f.other - f.discount);
  const labels = { shipping: "حمل", customs: "گمرک", commission: "کمیسیون", discount: "تخفیف", other: "سایر هزینه‌ها", rate: "نرخ ارز" };
  const n = (k: keyof typeof labels) => <Field label={labels[k]}><Input type="number" value={k === "rate" ? rate : f[k] || ""} onChange={(e) => setF({ ...f, [k]: +e.target.value })} /></Field>;
  const variantOpts = rows.map((r) => ({ value: r.id, label: `${r.product.name} · ${variantLabel(r)} · ${r.sku}`, search: `${r.product.brand} ${r.barcode}` }));
  const payAccount = accountId || accs.find((a) => a.type === "cash")?.id || accs[0]?.id || "";
  const up = (i: number, p: Partial<T.PurchaseItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const submit = () => {
    if (items.some((i) => !i.variantId)) { toast.error("برای هر ردیف یک کالا انتخاب کنید"); return; }
    if (items.some((i) => !(i.qty > 0))) { toast.error("تعداد هر ردیف باید بیشتر از صفر باشد"); return; }
    if (total < 0) { toast.error("مبلغ نهایی منفی است"); return; }
    create.mutate({ ...f, rate, paidAmount: paid || undefined, accountId: paid ? payAccount : undefined, items, total, date: today(), status: "received", clientKey: key.current }, {
      onSuccess: () => { setItems([]); setPaid(0); setF({ ...blankForm, currency: f.currency }); key.current = newKey(); toast.success("خرید ثبت شد؛ موجودی و حساب‌ها بروزرسانی شد"); }, onError: (e) => toast.error(e.message) });
  };
  if (suppliersLoading || productsLoading || ratesLoading) return <Loading />;
  return <><PageHeader title="خرید" subtitle="کالا را با نام، برند، SKU یا بارکد جستجو کنید. فقط کالا و تعداد الزامی است." />
    <Card title="فاکتور خرید جدید" className="mb-4">
      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Field label="تأمین‌کننده (اختیاری)"><SearchSelect clearable value={f.supplierId} onChange={(v) => setF({ ...f, supplierId: v })} options={sup.map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <Field label="ارز"><SearchSelect value={f.currency} onChange={(v) => v && setF({ ...f, currency: v as T.CurrencyCode, rate: 0 })} options={rates.map((r) => ({ value: r.code, label: `${r.code} · ${r.name}` }))} /></Field>
        {n("rate")}{n("shipping")}{n("customs")}{n("commission")}{n("discount")}{n("other")}
        <Field label="مبلغ پرداختی (تومان)"><Input type="number" value={paid || ""} onChange={(e) => setPaid(+e.target.value)} /></Field>
        {paid > 0 && <Field label="پرداخت از (صندوق / بانک)"><SearchSelect value={payAccount} onChange={setAccountId} options={accs.map((a) => ({ value: a.id, label: a.name }))} /></Field>}
      </div>
      <div className="mt-3 space-y-1.5">{items.map((it, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 sm:flex">
        <SearchSelect ariaLabel="کالای خرید" className="col-span-3 min-w-0 sm:flex-1" value={it.variantId} onChange={(v) => up(i, { variantId: v })} options={variantOpts} placeholder="جستجوی کالا (نام، برند، SKU، بارکد)…" />
        <Input aria-label="تعداد خرید" type="number" className="min-w-0 sm:w-24" placeholder="تعداد" value={it.qty || ""} onChange={(e) => up(i, { qty: +e.target.value })} />
        <Input aria-label="قیمت واحد خرید" type="number" className="min-w-0 sm:w-28" placeholder="قیمت واحد" value={it.unitPrice || ""} onChange={(e) => up(i, { unitPrice: +e.target.value })} />
        <Button variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</Button></div>)}
        <Button size="sm" variant="outline" onClick={() => setItems([...items, { variantId: "", qty: 1, unitPrice: 0 }])}>+ افزودن ردیف</Button></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm"><span>جمع اقلام: {toman(sub)} · <b>بهای تمام‌شده: {toman(total)}</b></span>
        <Button disabled={!items.length || create.isPending} onClick={submit}>ثبت خرید</Button></div>
    </Card>
    <DataTable rows={data} getId={(r) => r.id} search={(r) => `${r.number} ${sup.find((s) => s.id === r.supplierId)?.name ?? ""}`} columns={[
      { key: "n", header: "شماره", cell: (r) => r.number }, { key: "d", header: "تاریخ", cell: (r) => jdate(r.date), sort: (r) => r.date },
      { key: "s", header: "تأمین‌کننده", cell: (r) => sup.find((s) => s.id === r.supplierId)?.name ?? "—" }, { key: "c", header: "ارز / نرخ", cell: (r) => `${r.currency} · ${num(r.rate)}` },
      { key: "i", header: "اقلام", cell: (r) => num(r.items.length) }, { key: "t", header: "مبلغ نهایی", cell: (r) => toman(r.total), sort: (r) => r.total },
      { key: "p", header: "پرداخت‌شده", cell: (r) => toman(r.paidAmount ?? 0) },
      { key: "st", header: "وضعیت", cell: (r) => <Badge tone={r.status === "received" ? "success" : "warning"}>{r.status === "received" ? "دریافت شده" : "پیش‌نویس"}</Badge> },
    ]} /></>;
}
