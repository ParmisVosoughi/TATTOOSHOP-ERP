import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Field, Input } from "@/components/ui";
import { useApiMutation } from "@/api/hooks";
import type { Party } from "@/api/types";

export function PartyForm({ title, create, keys }: { title: string; create: (p: Omit<Party, "id" | "balance">) => Promise<Party>; keys: string[] }) {
  const [f, setF] = useState({ name: "", phone: "", city: "" });
  const m = useApiMutation(create, keys);
  return (
    <Card title={title} className="mb-4"><div className="grid gap-2 sm:grid-cols-4">
      <Field label="نام"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="تلفن"><Input dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="شهر"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
      <Button className="self-end" disabled={!f.name || m.isPending} onClick={() => m.mutate(f, { onSuccess: () => { setF({ name: "", phone: "", city: "" }); toast.success("ثبت شد"); }, onError: (e) => toast.error(e.message) })}>افزودن</Button>
    </div></Card>
  );
}
