import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";
import { Badge, Bars, Button, Card, Field, Input, Loading, PageHeader, Select, Stat } from "@/components/ui";
import { useApi, useApiMutation, useFlatVariants, useRates, pricing, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import type * as T from "@/api/types";
import { jdate, num, pct, toman, page, today } from "@/lib/format";

export const Route = createFileRoute("/users")({ head: page("کاربران و دسترسی", "مدیریت کاربران و سطوح دسترسی"), component: Page });
function Page() {
  const { data = [], isLoading } = useApi("users", api.users.list);
  const create = useApiMutation(api.users.create, ["users"]); const toggle = useApiMutation((u: T.AppUser) => api.users.update(u.id, { active: !u.active }), ["users"]);
  const [f, setF] = useState({ name: "", username: "", password: "", roleCode: "salesperson" });
  if (isLoading) return <Loading />;
  return <><PageHeader title="کاربران و دسترسی" />
    <Card title="کاربر جدید" className="mb-4"><div className="grid gap-2 sm:grid-cols-5">
      <Field label="نام"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="نام کاربری"><Input dir="ltr" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></Field>
      <Field label="رمز عبور"><Input dir="ltr" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <Field label="نقش"><Select value={f.roleCode} onChange={(e) => setF({ ...f, roleCode: e.target.value })}><option value="admin">مدیر سیستم</option><option value="manager">مدیر</option><option value="salesperson">فروشنده</option><option value="warehouse">انباردار</option><option value="accountant">حسابدار</option></Select></Field>
      <Button className="self-end" disabled={!f.username || !f.password || create.isPending} onClick={() => create.mutate(f, { onSuccess: () => { setF({ ...f, name: "", username: "", password: "" }); toast.success("کاربر ایجاد شد"); }, onError: (e) => toast.error(e.message) })}>افزودن</Button>
    </div></Card><DataTable rows={data} getId={(r) => r.id} search={(r) => r.name + r.username} columns={[
    { key: "n", header: "نام", cell: (r) => r.name }, { key: "u", header: "نام کاربری", cell: (r) => <code>{r.username}</code> }, { key: "r", header: "نقش", cell: (r) => r.role },
    { key: "p", header: "دسترسی‌ها", cell: (r) => <div className="flex flex-wrap gap-1">{r.permissions.map((p) => <Badge key={p} tone="primary">{p === "*" ? "همه" : p}</Badge>)}</div> },
    { key: "a", header: "وضعیت", cell: (r) => <button onClick={() => toggle.mutate(r, { onError: (e) => toast.error(e.message) })}><Badge tone={r.active ? "success" : "neutral"}>{r.active ? "فعال" : "غیرفعال"}</Badge></button> },
  ]} /></>;
}
