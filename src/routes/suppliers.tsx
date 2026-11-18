import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PartyForm } from "@/components/PartyForm";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, Select, Stat } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, pricing, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, num, pct, toman, page, today } from "@/lib/format";

export const Route = createFileRoute("/suppliers")({ head: page("تأمین‌کنندگان", "فهرست تأمین‌کنندگان"), component: Page });
function Page() {
  const { data = [], isLoading } = useApi("suppliers", api.suppliers.list);
  if (isLoading) return <Loading />;
  return <><PageHeader title="تأمین‌کنندگان" /><PartyForm title="تأمین‌کننده جدید" create={api.suppliers.create} keys={["suppliers"]} /><DataTable rows={data} getId={(r) => r.id} search={(r) => r.name + r.phone + r.city} columns={[
    { key: "n", header: "نام", cell: (r) => r.name, sort: (r) => r.name }, { key: "p", header: "تلفن", cell: (r) => <span dir="ltr">{r.phone}</span> },
    { key: "c", header: "شهر", cell: (r) => r.city }, { key: "b", header: "مانده حساب", cell: (r) => <span className={r.balance < 0 ? "text-destructive" : r.balance > 0 ? "text-success" : ""}>{toman(r.balance)}</span>, sort: (r) => r.balance },
  ]} /></>;
}
