import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Card, Input, Loading, PageHeader, Select } from "@/components/ui";
import { useApiMutation, useCategories, useProducts } from "@/api/hooks";
import { api } from "@/api/services";
import { num, page } from "@/lib/format";

export const Route = createFileRoute("/categories")({ head: page("دسته‌بندی‌ها", "مدیریت دسته‌ها و زیردسته‌های محصولات"), component: Categories });

function Categories() {
  const { data = [], isLoading } = useCategories();
  const { data: products = [] } = useProducts();
  const [name, setName] = useState(""); const [parent, setParent] = useState("");
  const save = useApiMutation(api.categories.save, ["categories"]);
  const del = useApiMutation(api.categories.remove, ["categories"]);
  if (isLoading) return <Loading />;
  const roots = data.filter((c) => !c.parentId);
  const count = (id: string) => products.filter((p) => p.categoryId === id).length;
  const rename = (id: string, old: string) => { const n = prompt("نام جدید", old); if (n) save.mutate({ id, name: n }); };
  return (
    <>
      <PageHeader title="دسته‌بندی‌ها" />
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="نام دسته" value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
          <Select value={parent} onChange={(e) => setParent(e.target.value)} className="w-56"><option value="">دسته اصلی</option>{roots.map((c) => <option key={c.id} value={c.id}>زیردسته: {c.name}</option>)}</Select>
          <Button disabled={!name} onClick={() => save.mutate({ name, parentId: parent || null }, { onSuccess: () => setName("") })}><Plus className="size-4" />افزودن</Button>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roots.map((c) => (
          <Card key={c.id} title={c.name} actions={<div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => rename(c.id, c.name)}><Pencil className="size-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => confirm("حذف دسته و زیردسته‌ها؟") && del.mutate(c.id)}><Trash2 className="size-3.5" /></Button></div>}>
            <div className="text-xs text-muted-foreground">{num(count(c.id))} محصول</div>
            <ul className="mt-2 space-y-1">
              {data.filter((s) => s.parentId === c.id).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded bg-muted px-2 py-1 text-sm">{s.name}
                  <span className="flex gap-1"><button onClick={() => rename(s.id, s.name)}><Pencil className="size-3" /></button><button onClick={() => del.mutate(s.id)}><Trash2 className="size-3" /></button></span></li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
