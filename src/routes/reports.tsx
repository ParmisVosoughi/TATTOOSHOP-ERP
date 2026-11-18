import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, Select, Stat } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, pricing, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, num, pct, toman, page, today } from "@/lib/format";

export const Route = createFileRoute("/reports")({ head: page("گزارش‌ها", "گزارش فروش، خرید و تاریخچه قیمت"), component: Page });
function Page() {
  const { data } = useApi("dashboard", api.dashboard); const { data: pu = [] } = useApi("purchases", api.purchases.list); const { rows } = useFlatVariants();
  if (!data) return <Loading />;
  return <><PageHeader title="گزارش‌ها" actions={<Button variant="outline" onClick={() => window.print()}>چاپ</Button>} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="گزارش فروش"><Bars data={data.salesByMonth.map((m) => ({ label: m.month, value: m.value }))} format={toman} /></Card>
      <Card title="گزارش خرید"><Bars data={pu.map((p) => ({ label: `${p.number} · ${jdate(p.date)}`, value: p.total }))} format={toman} /></Card>
      <Card title="تاریخچه قیمت" className="lg:col-span-2"><div className="max-h-96 overflow-y-auto text-sm">{rows.map((r) => <div key={r.id} className="flex justify-between border-b py-1.5"><span>{r.product.name} · {variantLabel(r)}</span><span className="text-xs text-muted-foreground">{r.priceHistory.map((h) => `${jdate(h.date)}: ${num(h.price)} ${r.currency}`).join(" ← ")}</span></div>)}</div></Card>
    </div></>;
}
