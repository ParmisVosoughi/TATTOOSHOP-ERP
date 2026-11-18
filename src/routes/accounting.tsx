import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, Select, Stat, type Tone } from "@/components/ui";
import { useApi, useApiMutation } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, jtime, num, toman, page, rial, parseNum } from "@/lib/format";
import { isoToJalaliInput, isoToTimeInput, jalaliInputToIso } from "@/lib/jalali";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/accounting")({ head: page("حسابداری", "درآمد، هزینه، حساب‌ها، دریافتنی و پرداختنی"), component: Page });
function Ledger({ acc }: { acc: T.Account }) {
  const { data: txs = [] } = useQuery({ queryKey: ["accountTx", acc.id], queryFn: () => api.accounts.transactions(acc.id) });
  const keys = ["accounts", "accountTx", "accounting", "dashboard"];
  const add = useApiMutation((t: { type: "deposit" | "withdraw"; amount: number; description: string; date?: string; ref?: string }) => api.accounts.addTx(acc.id, t), keys);
  const setBal = useApiMutation((b: number) => api.accounts.setBalance(acc.id, b), keys);
  const rename = useApiMutation((n: string) => api.accounts.rename(acc.id, n), ["accounts"]);
  const fresh = () => ({ type: "deposit" as "deposit" | "withdraw", amount: 0, description: "", date: isoToJalaliInput(new Date().toISOString()), time: isoToTimeInput(new Date().toISOString()), ref: "" });
  const [f, setF] = useState(fresh);
  const [bal, setBalTxt] = useState<string | null>(null); const [name, setName] = useState<string | null>(null);
  const isCash = acc.type === "cash";
  const submit = () => {
    const iso = jalaliInputToIso(f.date, f.time); if (!iso) { toast.error("تاریخ (مثل ۱۴۰۵/۰۸/۲۵) یا ساعت (مثل ۱۴:۳۰) نامعتبر است"); return; }
    add.mutate({ type: f.type, amount: f.amount, description: f.description, date: iso, ref: f.ref || undefined }, { onSuccess: () => { setF(fresh()); toast.success("تراکنش ثبت شد"); }, onError: (e) => toast.error(e.message) });
  };
  return (
    <Card title={`${isCash ? "دفتر صندوق" : "دفتر بانک"} — ${acc.name}${acc.code ? ` · کد ${acc.code}` : ""}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 rounded-lg bg-muted/50 p-3">
        <div><div className="text-xs text-muted-foreground">موجودی{acc.createdAt ? ` · ایجاد ${jdate(acc.createdAt)}` : ""}</div><div className="text-xl font-bold tabular-nums">{rial(acc.balance * 10)}</div><div className="text-xs text-muted-foreground">{toman(acc.balance)}</div></div>
        <div className="flex flex-wrap items-end gap-1.5">
          {!isCash && <><Field label="نام بانک"><Input className="w-40" value={name ?? acc.name} onChange={(e) => setName(e.target.value)} /></Field>
            <Button variant="outline" disabled={name === null || !name.trim() || name === acc.name || rename.isPending} onClick={() => rename.mutate(name!, { onSuccess: () => { setName(null); toast.success("نام بانک ویرایش شد (کد بانک ثابت می‌ماند)"); }, onError: (e) => toast.error(e.message) })}>ویرایش نام</Button></>}
          <Field label="تعدیل موجودی (تومان)"><Input type="number" className="w-40" value={bal ?? acc.balance} onChange={(e) => setBalTxt(e.target.value)} /></Field>
          <Button variant="outline" disabled={bal === null || parseNum(bal) === acc.balance || setBal.isPending} onClick={() => setBal.mutate(parseNum(bal ?? "0"), { onSuccess: () => { setBalTxt(null); toast.success("تراکنش تعدیل موجودی ثبت شد"); }, onError: (e) => toast.error(e.message) })}>ثبت تعدیل</Button></div>
      </div>
      <div className="mb-3 grid gap-2 sm:grid-cols-6">
        <Field label="نوع تراکنش"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as "deposit" | "withdraw" })}><option value="deposit">واریز</option><option value="withdraw">برداشت</option></Select></Field>
        <Field label="مبلغ (ریال)"><Input type="number" value={f.amount || ""} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></Field>
        <Field label="تاریخ (شمسی)"><Input dir="ltr" placeholder="1405/08/25" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="ساعت"><Input dir="ltr" placeholder="14:30" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
        <Field label="کد تراکنش (خودکار)"><Input dir="ltr" placeholder="خودکار" value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></Field>
        <Field label="شرح"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      </div>
      <div className="mb-3 flex justify-end"><Button disabled={!(f.amount > 0) || add.isPending} onClick={submit}>ثبت تراکنش</Button></div>
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>
        {["نوع", "مبلغ (ریال)", "شرح", "کد تراکنش", "تاریخ", "ساعت", "مانده پس از تراکنش"].map((h) => <th key={h} className="whitespace-nowrap p-2 text-start font-medium">{h}</th>)}</tr></thead>
        <tbody>{txs.map((t) => (
          <tr key={t.id} className="border-t">
            <td className="p-2"><span className={cn("inline-flex items-center gap-1 text-xs font-medium", t.type === "deposit" ? "text-success" : "text-destructive")}>{t.type === "deposit" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}{t.type === "deposit" ? "واریز" : "برداشت"}</span></td>
            <td className={cn("whitespace-nowrap p-2 font-bold tabular-nums", t.type === "deposit" ? "text-success" : "text-destructive")} dir="ltr">{t.type === "deposit" ? "+" : "−"}{num(t.amount)}</td>
            <td className="p-2">{t.description || (t.type === "deposit" ? "واریز" : "برداشت")}</td>
            <td className="p-2"><code className="text-xs">{t.ref}</code></td>
            <td className="whitespace-nowrap p-2 text-xs">{jdate(t.date)}</td>
            <td className="whitespace-nowrap p-2 text-xs">{jtime(t.date)}</td>
            <td className="whitespace-nowrap p-2 tabular-nums" dir="ltr">{num(t.balanceAfter * 10)}</td>
          </tr>))}
          {!txs.length && <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">تراکنشی ثبت نشده است</td></tr>}</tbody></table></div>
    </Card>
  );
}

function NewBank() {
  const [f, setF] = useState({ name: "", code: "", balance: 0 });
  const m = useApiMutation(api.accounts.create, ["accounts", "accountTx"]);
  return (
    <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-4">
      <Field label="نام بانک جدید"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="کد سه‌رقمی (خودکار)"><Input type="text" inputMode="numeric" maxLength={3} dir="ltr" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.replace(/\D/g, "") })} /></Field>
      <Field label="موجودی اولیه (تومان)"><Input type="number" value={f.balance || ""} onChange={(e) => setF({ ...f, balance: +e.target.value })} /></Field>
      <Button className="self-end" disabled={!f.name || m.isPending} onClick={() => m.mutate({ name: f.name, type: "bank", ...(f.code ? { code: f.code } : {}), ...(f.balance ? { balance: f.balance } : {}) }, { onSuccess: () => { setF({ name: "", code: "", balance: 0 }); toast.success("بانک تعریف شد"); }, onError: (e) => toast.error(e.message) })}>تعریف بانک</Button>
    </div>
  );
}

const stTone: Record<T.SalesInvoice["paymentStatus"], [string, Tone]> = { paid: ["پرداخت شده", "success"], partial: ["جزئی", "warning"], unpaid: ["پرداخت نشده", "danger"], refunded: ["مسترد", "neutral"] };
/** Walk-in customer account: invoices, sales, received payments, outstanding balance and transaction history. */
function WalkIn({ walk, sales, accs }: { walk: T.Party; sales: T.SalesInvoice[]; accs: T.Account[] }) {
  const mine = sales.filter((x) => x.customerId === walk.id); const sold = mine.filter((x) => x.type === "sale" && !x.voided);
  const { data: txs = [] } = useQuery({ queryKey: ["accountTx", "walkin", accs.length, mine.length, walk.balance], queryFn: async () => (await Promise.all(accs.map((a) => api.accounts.transactions(a.id)))).flat().filter((t) => t.invoiceId && mine.some((s) => s.id === t.invoiceId)), enabled: accs.length > 0 });
  const received = txs.reduce((s, t) => s + (t.type === "deposit" ? t.amount : -t.amount), 0) / 10;
  return <Card title={`حساب مشتری گذری · کد ${walk.code}`} className="lg:col-span-2">
    <div className="grid gap-3 sm:grid-cols-4"><Stat label="تعداد فاکتور" value={num(mine.length)} /><Stat label="جمع فروش" value={toman(mine.reduce((s, x) => s + x.total, 0))} hint={`${num(sold.length)} فاکتور فروش`} /><Stat label="دریافتی‌ها (خالص)" value={toman(received)} /><Stat label="مانده حساب" value={toman(walk.balance)} /></div>
    <div className="mt-3 overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{["شناسه", "شماره", "تاریخ", "نوع", "مبلغ", "پرداخت‌شده", "مانده", "وضعیت"].map((h) => <th key={h} className="whitespace-nowrap p-2 text-start font-medium">{h}</th>)}</tr></thead>
      <tbody>{mine.map((x) => <tr key={x.id} className="border-t"><td className="p-2"><code className="text-xs">{x.code}</code></td><td className="p-2">{x.number}</td><td className="p-2 text-xs">{jdate(x.date)}</td><td className="p-2">{x.type === "sale" ? "فروش" : "مرجوعی"}</td>
        <td className="p-2 tabular-nums">{toman(x.total)}</td><td className="p-2 tabular-nums">{toman(x.paidAmount ?? 0)}</td><td className="p-2 tabular-nums">{toman(x.outstanding ?? 0)}</td><td className="p-2"><Badge tone={stTone[x.paymentStatus][1]}>{stTone[x.paymentStatus][0]}</Badge></td></tr>)}
        {!mine.length && <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">هنوز فاکتوری برای مشتری گذری ثبت نشده است</td></tr>}</tbody></table></div>
  </Card>;
}

function Page() {
  const { data } = useApi("accounting", api.accounting); const { data: acc = [] } = useApi("accounts", api.accounts.list);
  const { data: sales = [] } = useApi("sales", api.sales.list); const { data: cus = [] } = useApi("customers", api.customers.list);
  const [selId, setSel] = useState("");
  if (!data) return <Loading />;
  const sel = acc.find((a) => a.id === selId) ?? acc[0];
  const walk = cus.find((c) => c.id === "walkin");
  return <><PageHeader title="حسابداری" subtitle="ارقام از سرور دریافت می‌شوند." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="درآمد" value={toman(data.income)} /><Stat label="هزینه‌ها" value={toman(data.expenses)} /><Stat label="دریافتنی‌ها" value={toman(data.receivables)} /><Stat label="پرداختنی‌ها" value={toman(data.payables)} /></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card title="سود و زیان">{data.pnl.map((p) => <div key={p.label} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{p.label}</span><span className={p.value < 0 ? "text-destructive" : ""}>{toman(p.value)}</span></div>)}</Card>
      <Card title="صندوق و حساب‌های بانکی">
        {acc.map((a) => <button key={a.id} onClick={() => setSel(a.id)} className={cn("flex w-full items-center justify-between rounded border-b px-2 py-2 text-sm last:border-0 hover:bg-muted", sel?.id === a.id && "bg-accent")}><span>{a.name} <Badge>{a.type === "cash" ? "نقد" : "بانک"}</Badge>{a.code && <span className="ms-1 text-xs text-muted-foreground">کد {a.code}</span>}</span><span className="tabular-nums">{toman(a.balance)}</span></button>)}
        <NewBank />
      </Card>
      <div className="lg:col-span-2">{sel && <Ledger key={sel.id} acc={sel} />}</div>
      {walk && <WalkIn walk={walk} sales={sales} accs={acc} />}
      <Card title="ارزش موجودی کالا" className="lg:col-span-2"><Bars data={data.inventoryValuation.map((v) => ({ label: v.category, value: v.value }))} format={toman} /></Card>
    </div></>;
}
