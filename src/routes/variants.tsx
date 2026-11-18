import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, Select, Stat } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, pricing, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, num, pct, toman, page, today } from "@/lib/format";

export const Route = createFileRoute("/variants")({ head: page("تنوع‌ها", "همه تنوع‌های محصولات"), component: Page });
function Page() {
  const { rows, isLoading } = useFlatVariants(); const { data: rates } = useRates();
  if (isLoading) return <Loading />;
  return <><PageHeader title="تنوع‌ها" /><DataTable rows={rows} getId={(r) => r.id} search={(r) => `${r.sku} ${r.barcode} ${r.product.name} ${variantLabel(r)}`} columns={[
    { key: "p", header: "محصول", cell: (r) => r.product.name, sort: (r) => r.product.name },
    { key: "a", header: "ویژگی‌ها", cell: (r) => <div className="flex flex-wrap gap-1">{Object.entries(r.attributes).map(([k, v]) => <Badge key={k}>{k}: {v}</Badge>)}</div> },
    { key: "s", header: "SKU", cell: (r) => <code className="text-xs">{r.sku}</code> }, { key: "bc", header: "بارکد", cell: (r) => <code className="text-xs">{r.barcode}</code> },
    { key: "pr", header: "قیمت", cell: (r) => toman(pricing(r, rates).adjusted), sort: (r) => pricing(r, rates).adjusted },
    { key: "h", header: "تاریخچه قیمت", cell: (r) => <span className="text-xs text-muted-foreground">{r.priceHistory.map((h) => `${jdate(h.date)}: ${num(h.price)}`).join(" ← ")}</span> },
  ]} /></>;
}
