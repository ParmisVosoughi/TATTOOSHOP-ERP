import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Button, Field, Input, Loading, Modal, PageHeader, SearchSelect, Select, type Tone } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, nowTime, num, toman, page, parseNum, rial } from "@/lib/format";

export const Route = createFileRoute("/invoices")({ head: page("فاکتورها", "تاریخچه فاکتورهای فروش و مرجوعی"), component: Page });
const st: Record<T.SalesInvoice["paymentStatus"], [string, Tone]> = { paid: ["پرداخت شده", "success"], partial: ["جزئی", "warning"], unpaid: ["پرداخت نشده", "danger"], refunded: ["مسترد", "neutral"] };
/** Invoice list filter: paid / unpaid (incl. partial) / archived / returned (return invoices, refunds, voided). */
const FILTERS = { paid: "پرداخت شده", unpaid: "پرداخت نشده", archived: "آرشیو شده", returned: "مرجوع شده" } as const;
export const matchesFilter = (r: T.SalesInvoice, f: string) => {
  if (!f) return true;
  if (f === "archived") return !!r.archived;
  if (r.archived) return false;
  if (f === "returned") return r.type === "return" || r.paymentStatus === "refunded" || !!r.voided;
  if (r.type === "return" || r.voided) return false;
  return f === "paid" ? r.paymentStatus === "paid" : r.paymentStatus === "unpaid" || r.paymentStatus === "partial";
};
function PayModal({ inv, onClose }: { inv: T.SalesInvoice | null; onClose: () => void }) {
  const { data: accs = [] } = useApi("accounts", api.accounts.list); const [amt, setAmt] = useState<string | null>(null); const [acc, setAcc] = useState("");
  const pay = useApiMutation((a: { id: string; amount: number; accountId: string }) => api.payments.sale(a.id, a.amount, a.accountId), ["sales", "customers", "accounts", "accounting", "dashboard", "accountTx"]);
  if (!inv) return null; const out = inv.outstanding ?? 0; const value = amt ?? String(out); const accountId = acc || inv.accountId || accs.find((a) => a.type === "cash")?.id || accs[0]?.id || "";
  const n = parseNum(value); const bad = !(n > 0) || n > out;
  return <Modal open onClose={onClose} title={`${inv.type === "sale" ? "ثبت دریافت" : "ثبت استرداد"} — ${inv.number}`}>
    <div className="grid gap-3"><div className="text-sm text-muted-foreground">مانده فاکتور: <b className="text-foreground">{toman(out)}</b></div>
      <Field label="مبلغ (تومان)"><Input type="number" value={value} onChange={(e) => setAmt(e.target.value)} /></Field>
      <Field label="حساب (صندوق / بانک)"><SearchSelect value={accountId} onChange={setAcc} options={accs.map((a) => ({ value: a.id, label: a.name }))} /></Field>
      {bad && <p className="text-xs text-destructive">مبلغ باید بین ۱ و مانده فاکتور باشد.</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>انصراف</Button>
        <Button disabled={bad || pay.isPending} onClick={() => pay.mutate({ id: inv.id, amount: n, accountId }, { onSuccess: () => { toast.success("پرداخت ثبت شد"); onClose(); }, onError: (e) => toast.error(e.message) })}>ثبت</Button></div></div>
  </Modal>;
}
function Details({ inv, onClose, name }: { inv: T.SalesInvoice | null; onClose: () => void; name: (id: string) => string }) {
  const { rows } = useFlatVariants(); const { data: accs = [] } = useApi("accounts", api.accounts.list);
  const { data: txs = [] } = useQuery({ queryKey: ["accountTx", "all", accs.length], queryFn: async () => (await Promise.all(accs.map((a) => api.accounts.transactions(a.id)))).flat(), enabled: accs.length > 0 });
  const { data: sales = [] } = useApi("sales", api.sales.list);
  if (!inv) return null; const mine = txs.filter((t) => t.invoiceId === inv.id); const rets = sales.filter((s) => s.returnOf === inv.id);
  return <Modal wide open onClose={onClose} title={`جزئیات فاکتور ${inv.number}`}>
    <div className="grid gap-2 text-sm sm:grid-cols-3"><div>شناسه: <code>{inv.code}</code></div><div>مشتری: {name(inv.customerId)}</div><div>تاریخ: {jdate(inv.date)}</div>
      <div>جمع: {toman(inv.total)}</div><div>پرداخت‌شده: {toman(inv.paidAmount ?? 0)}</div><div>مانده: {toman(inv.outstanding ?? 0)}</div></div>
    <table className="mt-3 w-full text-xs"><thead className="bg-muted"><tr><th className="p-1.5 text-start">کالا</th><th className="p-1.5 text-start">واحد</th><th className="p-1.5 text-start">تعداد</th><th className="p-1.5 text-start">قیمت</th><th className="p-1.5 text-start">تخفیف</th></tr></thead>
      <tbody>{inv.items.map((i, k) => { const r = rows.find((x) => x.id === i.variantId); return <tr key={k} className="border-t"><td className="p-1.5">{r ? `${r.product.name} · ${variantLabel(r)}` : i.variantId}</td><td className="p-1.5">{i.unit}</td><td className="p-1.5">{num(i.qty)}</td><td className="p-1.5">{toman(i.unitPrice)}</td><td className="p-1.5">{toman(i.discount)}</td></tr>; })}</tbody></table>
    <h3 className="mb-1 mt-4 text-sm font-semibold">پرداخت‌ها</h3>
    {mine.length ? mine.map((t) => <div key={t.id} className="flex justify-between border-b py-1 text-xs"><span>{accs.find((a) => a.id === t.accountId)?.name} · {t.ref} · {nowTime(t.date)}</span><span dir="ltr">{t.type === "deposit" ? "+" : "−"}{rial(t.amount)}</span></div>) : <p className="text-xs text-muted-foreground">پرداختی ثبت نشده است.</p>}
    {rets.length > 0 && <><h3 className="mb-1 mt-4 text-sm font-semibold">فاکتورهای مرجوعی</h3>{rets.map((r) => <div key={r.id} className="text-xs">{r.number} · <code>{r.code}</code> · {toman(r.total)}</div>)}</>}
  </Modal>;
}
function Page() {
  const { data = [], isLoading } = useApi("sales", api.sales.list); const { data: cus = [] } = useApi("customers", api.customers.list);
  const [f, setF] = useState(""); const [payFor, setPayFor] = useState<T.SalesInvoice | null>(null); const [view, setView] = useState<T.SalesInvoice | null>(null);
  const voidIt = useApiMutation((id: string) => api.payments.voidSale(id), ["sales", "products", "movements", "customers", "accounts", "accounting", "dashboard"]);
  const arch = useApiMutation((a: { id: string; archived: boolean }) => api.sales.archive(a.id, a.archived), ["sales"]);
  const name = (id: string) => cus.find((c) => c.id === id)?.name ?? "";
  if (isLoading) return <Loading />;
  return <><PayModal key={payFor?.id ?? "x"} inv={payFor} onClose={() => setPayFor(null)} /><Details inv={view} onClose={() => setView(null)} name={name} /><PageHeader title="فاکتورها" subtitle="جستجو بر اساس نام مشتری، شناسه فاکتور یا شماره؛ فیلتر بر اساس وضعیت." /><DataTable rows={data.filter((r) => matchesFilter(r, f))} getId={(r) => r.id} search={(r) => `${r.code} ${r.number} ${name(r.customerId)}`}
    filters={<Select aria-label="وضعیت فاکتور" className="w-auto" value={f} onChange={(e) => setF(e.target.value)}><option value="">همه وضعیت‌ها</option>{Object.entries(FILTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>} columns={[
    { key: "id", header: "شناسه فاکتور", cell: (r) => <code className="text-xs">{r.code}</code> },
    { key: "n", header: "شماره", cell: (r) => r.number }, { key: "d", header: "تاریخ", cell: (r) => jdate(r.date), sort: (r) => r.date },
    { key: "c", header: "مشتری", cell: (r) => name(r.customerId) }, { key: "t", header: "نوع", cell: (r) => <Badge tone={r.type === "sale" ? "primary" : "warning"}>{r.type === "sale" ? "فروش" : "مرجوعی"}</Badge> },
    { key: "a", header: "مبلغ", cell: (r) => toman(r.total), sort: (r) => r.total }, { key: "o", header: "مانده", cell: (r) => toman(r.outstanding ?? 0), sort: (r) => r.outstanding ?? 0 }, { key: "s", header: "پرداخت", cell: (r) => <>{r.archived ? <Badge tone="neutral">آرشیو</Badge> : <Badge tone={st[r.paymentStatus][1]}>{st[r.paymentStatus][0]}</Badge>}</> },
    { key: "ar", header: "", cell: (r) => <Button size="sm" variant="ghost" onClick={() => arch.mutate({ id: r.id, archived: !r.archived }, { onSuccess: () => toast.success(r.archived ? "از آرشیو خارج شد" : "آرشیو شد"), onError: (e) => toast.error(e.message) })}>{r.archived ? "خروج از آرشیو" : "آرشیو"}</Button> },
    { key: "v", header: "", cell: (r) => r.type === "sale" && !r.voided ? <Button size="sm" variant="ghost" onClick={() => confirm("فاکتور باطل شود؟ یک فاکتور مرجوعی کامل صادر می‌شود.") && voidIt.mutate(r.id, { onSuccess: () => toast.success("فاکتور ابطال شد"), onError: (e) => toast.error(e.message) })}>ابطال</Button> : r.voided ? <Badge tone="neutral">باطل‌شده</Badge> : null },
    { key: "p", header: "", cell: (r) => (r.outstanding ?? 0) > 0 && !r.voided ? <Button size="sm" variant="outline" onClick={() => setPayFor(r)}>ثبت پرداخت</Button> : null },
    { key: "dt", header: "", cell: (r) => <Button size="sm" variant="ghost" onClick={() => setView(r)}>جزئیات</Button> },
  ]} /></>;
}
