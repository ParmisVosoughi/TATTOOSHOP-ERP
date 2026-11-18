import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, Select, Stat } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, pricing, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, num, pct, toman, page, today } from "@/lib/format";

export const Route = createFileRoute("/settings")({ head: page("تنظیمات", "تنظیمات فروشگاه و اتصال سرور"), component: Page });
function Page() {
  const base = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) || "تنظیم نشده (داده آزمایشی)";
  const { data } = useApi("settings", api.settings.get); const save = useApiMutation(api.settings.update, ["settings"]);
  const [f, setF] = useState<Partial<T.StoreSettings>>({}); const v = { ...data, ...f } as T.StoreSettings;
  if (!data) return <Loading />;
  return <><PageHeader title="تنظیمات" /><div className="grid gap-4 md:grid-cols-2">
    <Card title="فروشگاه" actions={<Button size="sm" disabled={!Object.keys(f).length || save.isPending} onClick={() => save.mutate(f, { onSuccess: () => { setF({}); toast.success("ذخیره شد"); }, onError: (e) => toast.error(e.message) })}>ذخیره</Button>}><div className="space-y-2">
      <Field label="نام فروشگاه"><Input value={v.storeName} onChange={(e) => setF({ ...f, storeName: e.target.value })} /></Field>
      <Field label="نرخ مالیات فروش (٪)"><Input type="number" value={v.taxRate} onChange={(e) => setF({ ...f, taxRate: +e.target.value })} /></Field>
      <Field label="روش بهای تمام‌شده"><Select value={v.costingMethod} onChange={(e) => setF({ ...f, costingMethod: e.target.value as T.StoreSettings["costingMethod"] })}><option value="wac">میانگین موزون</option><option value="fifo">اولین ورود، اولین خروج (FIFO)</option></Select></Field>
      <Field label="ارز نمایش"><Select defaultValue="IRT"><option value="IRT">تومان</option></Select></Field><Field label="تقویم"><Select><option>شمسی (جلالی)</option></Select></Field></div></Card>
    <Card title="اتصال به سرور"><div className="text-sm">آدرس API: <code dir="ltr">{base}</code></div><p className="mt-2 text-xs text-muted-foreground">برای اتصال به بک‌اند Django مقدار VITE_API_BASE_URL را در فایل .env تنظیم کنید.</p></Card>
  </div></>;
}
