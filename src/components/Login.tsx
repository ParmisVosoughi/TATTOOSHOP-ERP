import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { login } from "@/api/client";

export function Login({ onDone }: { onDone: () => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); setErr(""); try { await login(u, p); onDone(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background bg-hero p-4">
      <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="animate-pop relative w-full max-w-sm rounded-3xl border bg-card/80 p-7 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center"><div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-primary text-2xl font-black text-primary-foreground shadow-glow">T</div><h1 className="text-xl font-black">ورود به تتو ERP</h1><p className="mt-1 text-xs text-muted-foreground">سیستم مدیریت فروشگاه لوازم تتو</p></div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="نام کاربری"><Input dir="ltr" autoFocus value={u} onChange={(e) => setU(e.target.value)} className="h-11" /></Field>
          <Field label="رمز عبور"><Input dir="ltr" type="password" value={p} onChange={(e) => setP(e.target.value)} className="h-11" /></Field>
          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
          <Button className="h-11 w-full" disabled={!u || !p || busy}>{busy ? "در حال ورود…" : "ورود"}</Button>
        </form>
      </div>
    </div>
  );
}
