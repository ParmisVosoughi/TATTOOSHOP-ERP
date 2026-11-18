import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, Select, Stat } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, pricing, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, num, pct, toman, page, today } from "@/lib/format";

export const Route = createFileRoute("/currencies")({ head: page("نرخ ارز", "مدیریت نرخ ارزها و تاریخچه"), component: Page });
function Page() {
  const { data = [], isLoading } = useRates(); const upd = useApiMutation((a: { code: T.CurrencyCode; rate: number }) => api.rates.update(a.code, a.rate), ["rates"]);
  const [vals, setVals] = useState<Record<string, string>>({});
  if (isLoading) return <Loading />;
  return <><PageHeader title="نرخ ارز" subtitle="تغییر نرخ فقط قیمت‌های تعدیل‌شده نمایشی را تغییر می‌دهد؛ قیمت‌های اصلی و سوابق خرید حفظ می‌شوند." />
    <div className="grid gap-4 md:grid-cols-3">{data.filter((r) => r.code !== "IRT").map((r) => { const c = ((r.rate - r.previousRate) / r.previousRate) * 100; return (
      <Card key={r.code} title={`${r.name} (${r.code})`}>
        <div className="text-2xl font-bold tabular-nums">{toman(r.rate)}</div>
        <div className="text-xs text-muted-foreground">قبلی: {toman(r.previousRate)} <span className={c >= 0 ? "text-success" : "text-destructive"}>{pct(c)}</span> · {jdate(r.updatedAt)}</div>
        <div className="mt-3 flex gap-1.5"><Input type="number" placeholder="نرخ جدید" value={vals[r.code] ?? ""} onChange={(e) => setVals({ ...vals, [r.code]: e.target.value })} />
          <Button disabled={upd.isPending} onClick={() => { const n = +(vals[r.code] ?? 0); if (n > 0) upd.mutate({ code: r.code, rate: n }, { onSuccess: () => toast.success("نرخ بروزرسانی شد") }); }}>ثبت</Button></div>
        {+(vals[r.code] ?? 0) > 0 && (() => { const d = ((+vals[r.code]! - r.rate) / r.rate) * 100; return <div className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${d >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{d >= 0 ? "افزایش" : "کاهش"} {pct(d)} نسبت به نرخ فعلی</div>; })()}
        <div className="mt-3 space-y-1 text-xs">{[...r.history].reverse().map((h, i) => <div key={i} className="flex justify-between text-muted-foreground"><span>{jdate(h.date)}</span><span>{num(h.rate)}</span></div>)}</div>
      </Card>); })}</div></>;
}
