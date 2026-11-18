import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Unlock, Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/DataTable";
import { Badge, Button, Field, Input, Loading, Modal, PageHeader, SearchSelect, Select } from "@/components/ui";
import type { CurrencyCode, CurrencyRate } from "@/api/types";
import { useApiMutation, useCategories, useFlatVariants, useRates, pricing, variantLabel, type FlatVariant } from "@/api/hooks";
import { api } from "@/api/services";
import { jdate, num, pct, toman, page, parseNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { changeStatus, percentChange, rateFromPercent } from "@/lib/money";

export const Route = createFileRoute("/price-list")({ head: page("لیست قیمت", "لیست قیمت پیشرفته با ویرایش سریع و تعدیل ارزی"), component: PriceList });

function PriceCell({ v }: { v: FlatVariant }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(String(v.sellingPrice));
  const m = useApiMutation((p: number) => api.variants.setPrice(v.id, p), ["products"]);
  const save = () => { const n = parseNum(val); if (!(n > 0)) { toast.error("قیمت باید عددی بزرگ‌تر از صفر باشد"); return; } setEdit(false); if (n !== v.sellingPrice) m.mutate(n, { onSuccess: () => toast.success("قیمت ذخیره شد"), onError: (e) => toast.error(e.message) }); };
  if (edit) return <Input autoFocus type="number" value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => setEdit(false)} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEdit(false); }} className="h-7 w-28" aria-label="قیمت پایه" />;
  return <span onDoubleClick={() => !v.locked && (setVal(String(v.sellingPrice)), setEdit(true))} title="دوبار کلیک برای ویرایش" className={cn("cursor-text rounded px-1 tabular-nums hover:bg-muted", v.locked && "cursor-not-allowed")}>{num(v.sellingPrice)} <span className="text-[10px] text-muted-foreground">{v.currency}</span></span>;
}

/** Double-click the price, type a toman value and press Enter to set a manual price (empty + Enter removes it). */
function AdjCell({ v, rates }: { v: FlatVariant; rates: CurrencyRate[] | undefined }) {
  const [edit, setEdit] = useState(false); const [val, setVal] = useState("");
  const m = useApiMutation((x: number | null) => api.variants.setOverride(v.id, x), ["products"]);
  const p = pricing(v, rates); const manual = v.manualOverride != null;
  const done = (commit: boolean) => { if (!commit) { setEdit(false); return; } const raw = String(val).trim(); const n = raw === "" ? null : parseNum(raw); if (n !== null && !(n > 0)) { toast.error("قیمت باید عددی بزرگ‌تر از صفر باشد"); return; } setEdit(false); if (n !== null && !(n > 0)) { toast.error("قیمت باید عددی بزرگ‌تر از صفر باشد"); return; } if (n !== v.manualOverride) m.mutate(n, { onSuccess: () => toast.success(n === null ? "قیمت دستی حذف شد" : "قیمت دستی ثبت شد"), onError: (e) => toast.error(e.message) }); };
  if (edit) return <Input autoFocus type="number" value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => setEdit(false)} onKeyDown={(e) => { if (e.key === "Enter") done(true); if (e.key === "Escape") done(false); }} className="h-7 w-32" aria-label="قیمت دستی" />;
  return (
    <div onDoubleClick={() => { setVal(String(Math.round(p.adjusted))); setEdit(true); }} title="دوبار کلیک و Enter برای ثبت قیمت دستی" className="cursor-text rounded px-1 leading-tight tabular-nums hover:bg-muted">
      {manual || p.change === 0 ? <span className="font-semibold">{toman(p.adjusted)}</span>
        : <><span>{toman(p.base)}</span> <span className={cn("font-semibold", p.change > 0 ? "text-success" : "text-destructive")}>← {toman(p.adjusted)} <span className="text-[11px] font-normal">({pct(p.change)})</span></span></>}
      {manual && <span className="ms-1 text-[10px] text-muted-foreground">دستی</span>}
    </div>
  );
}

/** Rate used by the current base prices of a currency (most common baseRate among non-locked, non-manual variants). */
export function baselineRate(rows: FlatVariant[], rate: CurrencyRate) {
  const cnt = new Map<number, number>();
  rows.filter((r) => r.currency === rate.code && !r.locked && r.manualOverride == null).forEach((r) => cnt.set(r.baseRate, (cnt.get(r.baseRate) ?? 0) + 1));
  return [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? rate.rate;
}

function CurrencyChange({ open, onClose, rows, rates }: { open: boolean; onClose: () => void; rows: FlatVariant[]; rates: CurrencyRate[] }) {
  const list = rates.filter((r) => r.code !== "IRT");
  const [code, setCode] = useState<CurrencyCode>("USD"); const rate = list.find((r) => r.code === code) ?? list[0];
  const [od, setOd] = useState<string | null>(null);
  const old = od !== null ? parseNum(od) : rate ? baselineRate(rows, rate) : 0;
  const [nw, setNw] = useState<string | null>(null); const [pc, setPc] = useState<string | null>(null);
  const newV = nw !== null ? parseNum(nw) : rate?.rate ?? 0;
  const pctV = pc !== null ? parseNum(pc) : percentChange(old, newV);
  const save = useApiMutation((a: { code: CurrencyCode; rate: number }) => api.rates.update(a.code, a.rate), ["rates"]);
  const apply = useApiMutation((c: CurrencyCode) => api.rates.apply(c), ["products", "rates"]);
  if (!rate) return null;
  const reset = () => { setNw(null); setPc(null); setOd(null); };
  const diff = Math.round(pctV * 100) / 100; const status = changeStatus(diff);
  return (
    <Modal open={open} onClose={onClose} title="تغییرات ارزی">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ارز" className="sm:col-span-2"><SearchSelect value={code} onChange={(v) => { if (v) { setCode(v as CurrencyCode); reset(); } }} options={list.map((r) => ({ value: r.code, label: `${r.name} (${r.code})` }))} /></Field>
        <Field label={`قیمت ${rate.name} قدیم`}><Input type="number" value={old} onChange={(e) => { setOd(e.target.value); setPc(null); }} /></Field>
        <Field label={`قیمت ${rate.name} جدید`}><Input type="number" value={nw ?? rate.rate} onChange={(e) => { setNw(e.target.value); setPc(null); }} /></Field>
        <Field label="درصد تغییر (٪)"><Input type="number" value={pc ?? (Math.round(pctV * 100) / 100)} onChange={(e) => { setPc(e.target.value); setNw(String(rateFromPercent(old, parseNum(e.target.value)))); }} /></Field>
        <div className={cn("self-end rounded-lg px-3 py-2 text-center text-sm font-bold", status === "increase" ? "bg-success/15 text-success" : status === "decrease" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground")}><span>{status === "none" ? "بدون تغییر" : `${status === "increase" ? "افزایش" : "کاهش"} ${diff > 0 ? "+" : "−"}${num(Math.abs(diff))}٪`}</span></div>
      </div>
      <p className="mt-3 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">قیمت قدیم و جدید را وارد کنید تا درصد خودکار محاسبه شود (یا مستقیم درصد را بنویسید). با «ذخیره تغییرات» فقط قیمت محاسبه‌شده کنار قیمت اصلی نمایش داده می‌شود و قیمت اصلی تغییر نمی‌کند.</p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={apply.isPending || old === rate.rate} onClick={() => confirm("قیمت‌های محاسبه‌شده به‌عنوان قیمت اصلی اعمال شوند؟") && apply.mutate(code, { onSuccess: () => { reset(); toast.success("تغییرات ارزی به قیمت‌ها اعمال شد"); }, onError: (e) => toast.error(e.message) })}>اعمال تغییرات ارزی به قیمت‌ها</Button>
        <Button disabled={save.isPending || !(newV > 0) || newV === rate.rate} onClick={() => save.mutate({ code, rate: newV }, { onSuccess: () => { reset(); toast.success("نرخ ذخیره شد؛ قیمت‌های محاسبه‌شده کنار قیمت اصلی نمایش داده می‌شوند"); }, onError: (e) => toast.error(e.message) })}>ذخیره تغییرات</Button>
      </div>
    </Modal>
  );
}

function PriceList() {
  const { rows, isLoading } = useFlatVariants();
  const { data: rates } = useRates();
  const { data: cats = [] } = useCategories();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [cat, setCat] = useState(""); const [brand, setBrand] = useState(""); const [stock, setStock] = useState("");
  const [percent, setPercent] = useState(""); const [fx, setFx] = useState(false); const [mode, setMode] = useState<"pct" | "rate">("pct"); const [oldR, setOldR] = useState(""); const [newR, setNewR] = useState("");
  const override = useApiMutation((v: number | null) => Promise.all([...sel].map((id) => api.variants.setOverride(id, v))).then(() => undefined), ["products"]);
  const bulk = useApiMutation((p: number) => api.variants.bulkAdjust([...sel], p), ["products"]);
  const lock = useApiMutation((l: boolean) => api.variants.setLock([...sel], l), ["products"]);
  if (isLoading) return <Loading />;
  const brands = [...new Set(rows.map((r) => r.product.brand))];
  const filtered = rows.filter((r) => (!cat || r.product.categoryId === cat) && (!brand || r.product.brand === brand) &&
    (!stock || (stock === "low" ? r.stock > 0 && r.stock <= r.minStock : stock === "out" ? r.stock === 0 : r.stock > r.minStock)));
  const cols: Column<FlatVariant>[] = [
    { key: "p", header: "محصول", cell: (r) => <span className="font-medium">{r.product.name}</span>, sort: (r) => r.product.name },
    { key: "v", header: "تنوع", cell: (r) => <span className="text-xs text-muted-foreground">{variantLabel(r)}</span> },
    { key: "sku", header: "SKU", cell: (r) => <code className="text-xs">{r.sku}</code>, sort: (r) => r.sku },
    { key: "b", header: "برند", cell: (r) => r.product.brand, sort: (r) => r.product.brand },
    { key: "cost", header: "بهای خرید", cell: (r) => <span className="tabular-nums">{toman(pricing(r, rates).cost)}</span>, sort: (r) => pricing(r, rates).cost },
    { key: "sell", header: "قیمت پایه فروش", cell: (r) => <PriceCell v={r} />, sort: (r) => pricing(r, rates).base },
    { key: "adj", header: "قیمت فروش (تومان)", sort: (r) => pricing(r, rates).adjusted, cell: (r) => <AdjCell v={r} rates={rates} /> },
    { key: "m", header: "سود", cell: (r) => { const m = pricing(r, rates).margin; return <Badge tone={m < 15 ? "danger" : m < 30 ? "warning" : "success"}>{pct(m)}</Badge>; }, sort: (r) => pricing(r, rates).margin },
    { key: "st", header: "موجودی", cell: (r) => <Badge tone={r.stock === 0 ? "danger" : r.stock <= r.minStock ? "warning" : "neutral"}>{num(r.stock)}</Badge>, sort: (r) => r.stock },
    { key: "cur", header: "ارز", cell: (r) => r.currency },
    { key: "u", header: "آخرین بروزرسانی", cell: (r) => <span className="text-xs">{jdate(r.updatedAt)}</span>, sort: (r) => r.updatedAt },
    { key: "l", header: "", cell: (r) => r.locked ? <Lock className="size-3.5 text-warning" /> : null },
  ];
  const ratePct = Math.round(percentChange(parseNum(oldR), parseNum(newR)) * 100) / 100;
  const doRate = () => { if (!(parseNum(oldR) > 0) || !(parseNum(newR) > 0) || !ratePct || !sel.size) { toast.error("قیمت قدیم و جدید و ردیف‌ها را مشخص کنید"); return; } bulk.mutate(ratePct, { onSuccess: () => toast.success(`قیمت‌ها ${pct(ratePct)} تغییر کرد (ردیف‌های قفل‌شده تغییر نکردند)`) }); };
  const doBulk = (sign: 1 | -1) => { const n = parseNum(percent); if (!n || !sel.size) { toast.error("درصد و ردیف‌ها را انتخاب کنید"); return; } bulk.mutate(n * sign, { onSuccess: () => toast.success("قیمت‌ها بروزرسانی شد (ردیف‌های قفل‌شده تغییر نکردند)") }); };
  const exportCsv = () => {
    const csv = ["محصول,تنوع,SKU,برند,قیمت تعدیل‌شده,موجودی", ...filtered.map((r) => [r.product.name, variantLabel(r), r.sku, r.product.brand, Math.round(pricing(r, rates).adjusted), r.stock].join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); a.download = "price-list.csv"; a.click();
  };
  return (
    <>
      <PageHeader title="لیست قیمت" subtitle="برای قیمت دستی روی قیمت دوبار کلیک کنید، مبلغ را بنویسید و Enter بزنید. قیمت‌های سبز/قرمز محاسبه‌شده بر اساس نرخ جدید ارز هستند." actions={<><Button onClick={() => setFx(true)}><RefreshCcw className="size-4" />تغییرات ارزی</Button><Button variant="outline" onClick={exportCsv}><Download className="size-4" />خروجی CSV</Button></>} />
      <CurrencyChange open={fx} onClose={() => setFx(false)} rows={rows} rates={rates ?? []} />
      <DataTable rows={filtered} columns={cols} getId={(r) => r.id} selected={sel} onSelect={setSel} infinite
        search={(r) => `${r.product.name} ${r.sku} ${r.product.brand} ${r.barcode} ${variantLabel(r)}`}
        rowClass={(r) => (r.locked ? "opacity-75" : "")}
        filters={<>
          <SearchSelect clearable className="w-44" placeholder="همه دسته‌ها" value={cat} onChange={setCat} options={cats.map((c) => ({ value: c.id, label: c.name }))} />
          <SearchSelect clearable className="w-40" placeholder="همه برندها" value={brand} onChange={setBrand} options={brands.map((b) => ({ value: b, label: b }))} />
          <Select value={stock} onChange={(e) => setStock(e.target.value)} className="w-auto"><option value="">همه موجودی‌ها</option><option value="ok">موجود</option><option value="low">رو به اتمام</option><option value="out">ناموجود</option></Select>
        </>}
        toolbar={<>
          <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">{(["pct", "rate"] as const).map((m) => <button key={m} type="button" onClick={() => setMode(m)} className={cn("rounded-md px-2.5 py-1 transition", mode === m ? "bg-card font-semibold shadow-sm" : "text-muted-foreground")}>{m === "pct" ? "با درصد" : "با قیمت دلار"}</button>)}</div>
          {mode === "pct" ? <>
            <Input type="number" placeholder="٪" value={percent} onChange={(e) => setPercent(e.target.value)} className="w-20" />
            <Button size="sm" variant="outline" className="text-success" onClick={() => doBulk(1)}>افزایش ٪</Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => doBulk(-1)}>کاهش ٪</Button>
          </> : <>
            <Input type="number" placeholder="دلار قدیم" value={oldR} onChange={(e) => setOldR(e.target.value)} className="w-28" />
            <span className="text-muted-foreground">←</span>
            <Input type="number" placeholder="دلار جدید" value={newR} onChange={(e) => setNewR(e.target.value)} className="w-28" />
            <Badge tone={ratePct > 0 ? "success" : ratePct < 0 ? "danger" : "neutral"}>{ratePct ? pct(ratePct) : "—"}</Badge>
            <Button size="sm" disabled={!ratePct || bulk.isPending} onClick={doRate}>اعمال</Button>
          </>}
          <Button size="sm" variant="outline" disabled={!sel.size} onClick={() => override.mutate(null, { onSuccess: () => toast.success("قیمت دستی حذف شد") })}>حذف دستی</Button>
          <Button size="sm" variant="outline" disabled={!sel.size} onClick={() => lock.mutate(true)}><Lock className="size-3.5" />قفل</Button>
          <Button size="sm" variant="outline" disabled={!sel.size} onClick={() => lock.mutate(false)}><Unlock className="size-3.5" />باز</Button>
        </>} />
    </>
  );
}
