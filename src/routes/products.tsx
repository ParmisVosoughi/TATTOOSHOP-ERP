import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Button, Card, Field, Input, Loading, Modal, PageHeader, SearchSelect, Select } from "@/components/ui";
import { mergeUnits, useApiMutation, useCategories, useProducts } from "@/api/hooks";
import { api } from "@/api/services";
import type { CurrencyCode, PackUnit, Product, Variant } from "@/api/types";
import { num, page, today } from "@/lib/format";

export const Route = createFileRoute("/products")({ head: page("محصولات", "مدیریت محصولات، تنوع‌ها و واحدهای بسته‌بندی"), component: Products });

const blankVariant = (attrKeys: string[]): Variant => ({ extraUnits: [], id: "", productId: "", sku: "", barcode: "", attributes: Object.fromEntries(attrKeys.map((k) => [k, ""])), purchasePrice: 0, sellingPrice: 0, currency: "IRT", baseRate: 1, stock: 0, minStock: 0, locked: false, manualOverride: null, updatedAt: today(), priceHistory: [] });
const blank = (): Product => ({ id: "", name: "", sku: "", brand: "", categoryId: "", description: "", images: [], attributes: {}, inventoryMode: "shared", units: [{ name: "عدد", factor: 1 }], variants: [] });

function KV({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const entries = Object.entries(value);
  const set = (i: number, k: string, v: string) => onChange(Object.fromEntries(entries.map((e, j) => (j === i ? [k, v] : e))));
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-1.5"><Input placeholder="ویژگی" value={k} onChange={(e) => set(i, e.target.value, v)} /><Input placeholder="مقدار" value={v} onChange={(e) => set(i, k, e.target.value)} />
          <Button variant="ghost" size="sm" onClick={() => onChange(Object.fromEntries(entries.filter((_, j) => j !== i)))}><Trash2 className="size-3.5" /></Button></div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange({ ...value, [`ویژگی ${entries.length + 1}`]: "" })}><Plus className="size-3.5" />افزودن ویژگی</Button>
    </div>
  );
}

/** Packaging and price are defined together: each row is a pack (title, count of base units, selling price). */
function Packs({ v, baseName, onChange }: { v: Variant; baseName: string; onChange: (patch: Partial<Variant>) => void }) {
  const extra = v.extraUnits ?? [];
  const set = (i: number, patch: Partial<PackUnit>) => onChange({ extraUnits: extra.map((u, j) => (j === i ? { ...u, ...patch } : u)) });
  return (
    <div className="mt-2 rounded-md bg-muted/40 p-2">
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">بسته‌بندی و قیمت فروش ({v.currency})
        <Button size="sm" variant="ghost" onClick={() => onChange({ extraUnits: [...extra, { name: "", factor: 1, price: 0 }] })}><Plus className="size-3.5" />بسته‌بندی</Button></div>
      <div className="space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5"><span className="w-28 rounded border bg-card px-2 py-1.5">{baseName || "تکی"} (تکی)</span><span className="text-muted-foreground">۱ عدد</span>
          <Input type="number" className="w-36" aria-label="قیمت تکی" placeholder="قیمت" value={v.sellingPrice || ""} onChange={(e) => onChange({ sellingPrice: +e.target.value })} /></div>
        {extra.map((u, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <Input className="w-28" placeholder="عنوان (مثلاً بسته)" aria-label="عنوان بسته" value={u.name} onChange={(e) => set(i, { name: e.target.value })} />
            <Input type="number" className="w-20" aria-label="تعداد در بسته" placeholder="تعداد" value={u.factor || ""} onChange={(e) => set(i, { factor: +e.target.value })} /><span className="text-muted-foreground">عددی</span>
            <Input type="number" className="w-36" aria-label="قیمت بسته" placeholder="قیمت" value={u.price || ""} onChange={(e) => set(i, { price: +e.target.value })} />
            <Button size="sm" variant="ghost" onClick={() => onChange({ extraUnits: extra.filter((_, j) => j !== i) })}><Trash2 className="size-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductEditor({ initial, onClose }: { initial: Product; onClose: () => void }) {
  const [p, setP] = useState<Product>(() => { const c = structuredClone(initial); c.variants = c.variants.map((v) => ({ ...v, extraUnits: mergeUnits(c.units.slice(1), v.extraUnits ?? []) })); return c; });
  const { data: cats = [] } = useCategories();
  const save = useApiMutation(api.products.save, ["products"]);
  const baseName = p.units[0]?.name ?? "عدد";
  // Product-level units are derived from the variants' packs so inventory and sales keep working.
  const build = (): Product => {
    const variants = p.variants.map((v) => ({ ...v, extraUnits: (v.extraUnits ?? []).filter((u) => u.name.trim() && u.factor > 0) }));
    const names = new Map<string, number>(); variants.forEach((v) => v.extraUnits.forEach((u) => names.has(u.name) || names.set(u.name, u.factor)));
    const old = (n: string) => initial.units.find((u) => u.name === n);
    const units: PackUnit[] = [{ ...(old(baseName) ?? {}), name: baseName, factor: 1 }, ...[...names].map(([name, factor]) => ({ ...(old(name) ?? {}), name, factor }))];
    return { ...p, units, variants, categoryId: p.categoryId || cats[0]?.id || "" };
  };
  const up = (patch: Partial<Product>) => setP({ ...p, ...patch });
  const upV = (i: number, patch: Partial<Variant>) => up({ variants: p.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const attrKeys = Object.keys(p.variants[0]?.attributes ?? {});
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="نام محصول"><Input value={p.name} onChange={(e) => up({ name: e.target.value })} /></Field>
        <Field label="SKU (خودکار در صورت خالی بودن)"><Input value={p.sku} placeholder="خودکار" onChange={(e) => up({ sku: e.target.value })} dir="ltr" /></Field>
        <Field label="برند"><Input value={p.brand} onChange={(e) => up({ brand: e.target.value })} /></Field>
        <Field label="دسته‌بندی"><SearchSelect value={p.categoryId || cats[0]?.id || ""} onChange={(v) => up({ categoryId: v })} options={cats.map((c) => ({ value: c.id, label: (c.parentId ? "— " : "") + c.name }))} /></Field>
        <Field label="حالت موجودی"><Select value={p.inventoryMode} onChange={(e) => up({ inventoryMode: e.target.value as Product["inventoryMode"] })}><option value="shared">مشترک (واحد پایه)</option><option value="independent">مستقل برای هر بسته‌بندی</option></Select></Field>
        <Field label="آدرس تصاویر (با کاما)"><Input dir="ltr" value={p.images.join(",")} onChange={(e) => up({ images: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
        <Field label="توضیحات" className="sm:col-span-3"><textarea className="input-base h-16 py-2" value={p.description} onChange={(e) => up({ description: e.target.value })} /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="ویژگی‌های محصول"><KV value={p.attributes} onChange={(attributes) => up({ attributes })} /></Card>
        <Card title="واحد پایه"><Field label="نام واحد پایه (تکی)"><Input value={baseName} onChange={(e) => up({ units: [{ ...(p.units[0] ?? { factor: 1 }), name: e.target.value, factor: 1 }, ...p.units.slice(1)] })} /></Field>
          <p className="mt-2 text-xs text-muted-foreground">بسته‌بندی‌ها و قیمت هر کدام داخل هر تنوع تعریف می‌شود.</p></Card>
      </div>
      <Card title={`تنوع‌ها (${num(p.variants.length)})`} actions={<Button size="sm" onClick={() => up({ variants: [...p.variants, blankVariant(attrKeys)] })}><Plus className="size-4" />افزودن تنوع</Button>}>
        <div className="space-y-3">
          {p.variants.map((v, i) => (
            <div key={i} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">تنوع {num(i + 1)}<Button size="sm" variant="ghost" onClick={() => up({ variants: p.variants.filter((_, j) => j !== i) })}><Trash2 className="size-3.5" /></Button></div>
              <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
                <Field label="SKU"><Input dir="ltr" placeholder="خودکار" value={v.sku} onChange={(e) => upV(i, { sku: e.target.value })} /></Field>
                <Field label="بارکد"><Input dir="ltr" placeholder="خودکار" value={v.barcode} onChange={(e) => upV(i, { barcode: e.target.value })} /></Field>
                <Field label="قیمت خرید"><Input type="number" value={v.purchasePrice} onChange={(e) => upV(i, { purchasePrice: +e.target.value })} /></Field>
                <Field label="ارز"><SearchSelect value={v.currency} onChange={(c) => c && upV(i, { currency: c as CurrencyCode })} options={["IRT", "USD", "AED", "CNY"].map((c) => ({ value: c, label: c }))} /></Field>
                <Field label="نرخ پایه"><Input type="number" value={v.baseRate} onChange={(e) => upV(i, { baseRate: +e.target.value })} /></Field>
                <Field label="موجودی"><Input type="number" value={v.stock} onChange={(e) => upV(i, { stock: +e.target.value })} /></Field>
                <Field label="حداقل موجودی"><Input type="number" value={v.minStock} onChange={(e) => upV(i, { minStock: +e.target.value })} /></Field>
              </div>
              <Packs v={v} baseName={baseName} onChange={(patch) => upV(i, patch)} />
              <div className="mt-2"><div className="mb-1 text-xs text-muted-foreground">ویژگی‌های تنوع</div><KV value={v.attributes} onChange={(attributes) => upV(i, { attributes })} /></div>
            </div>
          ))}
          {!p.variants.length && <p className="text-center text-sm text-muted-foreground">هنوز تنوعی ثبت نشده — روی «افزودن تنوع» بزنید.</p>}
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>انصراف</Button>
        <Button disabled={!p.name.trim() || save.isPending} onClick={() => { const b = build(); const bad = b.variants.find((v) => new Set((v.extraUnits ?? []).map((u) => u.name.trim())).size !== (v.extraUnits ?? []).length || (v.extraUnits ?? []).some((u) => u.name.trim() === baseName)); if (bad) { toast.error("عنوان بسته‌بندی‌ها باید یکتا و متفاوت از واحد پایه باشد"); return; } save.mutate(b, { onSuccess: () => { toast.success("محصول ذخیره شد"); onClose(); }, onError: (e) => toast.error(e.message) }); }}>ذخیره محصول</Button>
      </div>
    </div>
  );
}

function Products() {
  const { data = [], isLoading } = useProducts();
  const { data: cats = [] } = useCategories();
  const [edit, setEdit] = useState<Product | null>(null);
  const del = useApiMutation(api.products.remove, ["products"]);
  if (isLoading) return <Loading />;
  return (
    <>
      <PageHeader title="محصولات" subtitle="محصولات با ویژگی‌های پویا، تنوع‌های نامحدود و واحدهای بسته‌بندی" actions={<Button onClick={() => setEdit(blank())}><Plus className="size-4" />محصول جدید</Button>} />
      <DataTable rows={data} getId={(r) => r.id} search={(r) => `${r.name} ${r.sku} ${r.brand} ${r.variants.map((v) => `${v.sku} ${v.barcode} ${Object.values(v.attributes).join(" ")}`).join(" ")}`} columns={[
        { key: "n", header: "نام", cell: (r) => <button className="font-medium hover:text-primary" onClick={() => setEdit(r)}>{r.name}</button>, sort: (r) => r.name },
        { key: "s", header: "SKU", cell: (r) => <code className="text-xs">{r.sku}</code> },
        { key: "b", header: "برند", cell: (r) => r.brand, sort: (r) => r.brand },
        { key: "c", header: "دسته", cell: (r) => cats.find((c) => c.id === r.categoryId)?.name },
        { key: "v", header: "تنوع‌ها", cell: (r) => num(r.variants.length), sort: (r) => r.variants.length },
        { key: "u", header: "واحدها", cell: (r) => r.units.map((u) => u.name).join("، ") },
        { key: "m", header: "موجودی", cell: (r) => <Badge tone={r.inventoryMode === "shared" ? "primary" : "neutral"}>{r.inventoryMode === "shared" ? "مشترک" : "مستقل"}</Badge> },
        { key: "a", header: "", cell: (r) => <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setEdit(r)}>ویرایش</Button><Button size="sm" variant="ghost" onClick={() => confirm("حذف شود؟") && del.mutate(r.id)}><Trash2 className="size-3.5" /></Button></div> },
      ]} />
      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "ویرایش محصول" : "محصول جدید"}>{edit && <ProductEditor initial={edit} onClose={() => setEdit(null)} />}</Modal>
    </>
  );
}
