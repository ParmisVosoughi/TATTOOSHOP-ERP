import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, SearchSelect, Select, Stat } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, pricing, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, num, pct, toman, page, today } from "@/lib/format";

export const Route = createFileRoute("/expenses")({ head: page("هزینه‌ها", "ثبت و مشاهده هزینه‌ها"), component: Page });
function Page() {
  const { data = [] } = useApi("expenses", api.expenses.list); const add = useApiMutation(api.expenses.create, ["expenses", "accounts", "accounting", "dashboard"]);
  const { data: accs = [] } = useApi("accounts", api.accounts.list);
  const [f, setF] = useState({ title: "", category: "", amount: 0, account: "" });
  return <><PageHeader title="هزینه‌ها" />
    <Card className="mb-4"><div className="grid gap-2 sm:grid-cols-5">
      <Field label="عنوان"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="دسته"><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
      <Field label="مبلغ (تومان)"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></Field>
      <Field label="حساب"><SearchSelect value={f.account || accs[0]?.name || ""} onChange={(v) => setF({ ...f, account: v })} options={accs.map((a) => ({ value: a.name, label: a.name }))} /></Field>
      <Button className="self-end" disabled={!f.title || !f.amount} onClick={() => add.mutate({ ...f, account: f.account || accs[0]?.name || "", date: today() }, { onSuccess: () => setF({ ...f, title: "", amount: 0 }), onError: (e) => toast.error(e.message) })}>ثبت هزینه</Button>
    </div></Card>
    <DataTable rows={data} getId={(r) => r.id} search={(r) => r.title + r.category} columns={[
      { key: "d", header: "تاریخ", cell: (r) => jdate(r.date), sort: (r) => r.date }, { key: "t", header: "عنوان", cell: (r) => r.title },
      { key: "c", header: "دسته", cell: (r) => <Badge>{r.category}</Badge> }, { key: "a", header: "مبلغ", cell: (r) => toman(r.amount), sort: (r) => r.amount }, { key: "ac", header: "حساب", cell: (r) => r.account },
    ]} /></>;
}
