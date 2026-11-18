import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Boxes, Coins, FileText, Package, Plus, Receipt, ShoppingCart, Tags, TrendingDown, TrendingUp, Trophy, Wallet } from "lucide-react";
import { Badge, Bars, Card, Loading, Stat } from "@/components/ui";
import { useApi, useFlatVariants, useRates, variantLabel } from "@/api/hooks";
import { api } from "@/api/services";
import { jdate, num, pct, toman, page } from "@/lib/format";

export const Route = createFileRoute("/")({ head: page("داشبورد", "نمای کلی فروش، خرید، سود و موجودی فروشگاه تتو"), component: Dashboard });

function AreaChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <div className="py-16 text-center text-sm text-muted-foreground">داده‌ای نیست</div>;
  const W = 600, H = 220, P = 10, max = Math.max(...data.map((d) => d.value), 1);
  const x = (i: number) => (data.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (data.length - 1));
  const y = (v: number) => H - P - (v / max) * (H - 2 * P - 10);
  const pts = data.map((d, i) => [x(i), y(d.value)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full overflow-visible" preserveAspectRatio="none">
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity=".35" /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--color-border)" strokeDasharray="4 6" />)}
        <path d={`${line} L${x(data.length - 1)},${H} L${x(0)},${H} Z`} fill="url(#ag)" className="animate-fade-up" />
        <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="animate-draw" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--color-card)" stroke="var(--color-primary)" strokeWidth="2.5" vectorEffect="non-scaling-stroke"><title>{`${data[i]!.label}: ${toman(data[i]!.value)}`}</title></circle>)}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground" dir="rtl">{[...data].reverse().map((d) => <span key={d.label}>{d.label}</span>)}</div>
    </div>
  );
}

const QUICK = [
  { to: "/sales", label: "فروش جدید", icon: Receipt },
  { to: "/purchases", label: "خرید جدید", icon: ShoppingCart },
  { to: "/products", label: "محصول جدید", icon: Package },
  { to: "/price-list", label: "لیست قیمت", icon: Tags },
] as const;

function Dashboard() {
  const { data } = useApi("dashboard", api.dashboard);
  const { data: sales = [] } = useApi("sales", api.sales.list);
  const { data: purchases = [] } = useApi("purchases", api.purchases.list);
  const { data: rates = [] } = useRates();
  const { rows } = useFlatVariants();
  if (!data) return <Loading />;
  const low = rows.filter((r) => r.stock <= r.minStock);
  const margin = data.totalSales ? (data.estimatedProfit / data.totalSales) * 100 : 0;
  return (
    <div className="space-y-5">
      <section className="animate-fade-up relative overflow-hidden rounded-3xl border bg-card bg-hero p-5 shadow-card sm:p-7">
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground">امروز {jdate(new Date().toISOString())}</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">خوش آمدید 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">خلاصه وضعیت فروشگاه در یک نگاه</p>
          </div>
          <div className="grid w-full grid-cols-4 gap-2 sm:w-auto">
            {QUICK.map((q) => <Link key={q.to} to={q.to} className="group flex flex-col items-center gap-1.5 rounded-2xl border bg-card/70 px-3 py-3 text-[11px] font-semibold backdrop-blur transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"><span className="grid size-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground transition group-hover:scale-110"><q.icon className="size-4" /></span>{q.label}</Link>)}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat delay={0} icon={<TrendingUp />} label="کل فروش" value={toman(data.totalSales)} hint={`${num(sales.length)} فاکتور`} />
        <Stat delay={70} icon={<ShoppingCart />} label="کل خرید" value={toman(data.totalPurchases)} hint={`${num(purchases.length)} خرید`} />
        <Stat delay={140} icon={<Wallet />} label="سود تخمینی" value={toman(data.estimatedProfit)} tone={data.estimatedProfit >= 0 ? "success" : "danger"} hint={`حاشیه سود ${pct(margin)}`} />
        <Stat delay={210} icon={<Boxes />} label="ارزش موجودی" value={toman(data.inventoryValue)} tone={low.length ? "danger" : undefined} hint={low.length ? `${num(low.length)} کالا رو به اتمام` : "موجودی کافی"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="روند فروش ماهانه" icon={<TrendingUp />} className="lg:col-span-2" actions={<Link to="/reports" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">گزارش کامل<ArrowLeft className="size-3" /></Link>}>
          <AreaChart data={data.salesByMonth.map((m) => ({ label: m.month, value: m.value }))} />
        </Card>
        <Card title="نرخ ارز" icon={<Coins />} actions={<Link to="/currencies" className="text-xs font-semibold text-primary hover:underline">مدیریت</Link>}>
          <div className="space-y-2">
            {rates.filter((r) => r.code !== "IRT").map((r) => { const c = r.previousRate ? ((r.rate - r.previousRate) / r.previousRate) * 100 : 0; const up = c >= 0; return (
              <div key={r.code} className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 transition hover:bg-muted/60">
                <span className="grid size-9 place-items-center rounded-lg bg-card text-[11px] font-black shadow-sm" dir="ltr">{r.code}</span>
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{r.name}</div><div className="text-xs tabular-nums text-muted-foreground">{toman(r.rate)}</div></div>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${up ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"}`}>{up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}{pct(c)}</span>
              </div>); })}
          </div>
        </Card>
        <Card title="پرفروش‌ترین‌ها" icon={<Trophy />}><Bars data={data.topProducts.map((t) => ({ label: t.name, value: t.qty }))} format={num} /></Card>
        <Card title={`هشدار موجودی (${num(low.length)})`} icon={<AlertTriangle />} actions={<Link to="/inventory" className="text-xs font-semibold text-primary hover:underline">انبار</Link>}>
          {low.length ? <div className="space-y-1">{low.slice(0, 6).map((r) => <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted/50"><span className="min-w-0 truncate">{r.product.name} <span className="text-xs text-muted-foreground">{variantLabel(r)}</span></span><Badge tone={r.stock ? "warning" : "danger"}>{r.stock ? num(r.stock) : "ناموجود"}</Badge></div>)}</div> : <div className="py-8 text-center text-sm text-muted-foreground">همه کالاها موجودند ✓</div>}
        </Card>
        <Card title="آخرین فاکتورها" icon={<FileText />} actions={<Link to="/sales" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Plus className="size-3" />جدید</Link>}>
          <div className="space-y-1">{sales.slice(0, 5).map((s) => <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted/50"><span className="font-medium">{s.number}</span><span className="font-bold tabular-nums">{toman(s.total)}</span></div>)}</div>
        </Card>
        <Card title="آخرین خریدها" icon={<ShoppingCart />} className="lg:col-span-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{purchases.slice(0, 5).map((p, i) => <div key={p.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-up rounded-xl border bg-muted/30 p-3 transition hover:-translate-y-0.5 hover:shadow-card"><div className="text-xs text-muted-foreground">{p.number} · {jdate(p.date)}</div><div className="mt-1 font-bold tabular-nums">{toman(p.total)}</div></div>)}</div>
        </Card>
      </div>
    </div>
  );
}
