import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Search, ChevronsRight, LogOut, BarChart3, Boxes, Coins, FileText, FolderTree, Gauge, Layers, Menu, Moon, Package, Receipt, Settings, ShieldCheck, ShoppingCart, Sun, Tags, Truck, Users, Wallet, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { USE_MOCK, auth } from "@/api/client";
import { Login } from "@/components/Login";

export const NAV = [
  { to: "/", label: "داشبورد", icon: Gauge },
  { to: "/price-list", label: "لیست قیمت", icon: Tags },
  { to: "/products", label: "محصولات", icon: Package },
  { to: "/categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { to: "/variants", label: "تنوع‌ها", icon: Layers },
  { to: "/inventory", label: "انبار", icon: Boxes },
  { to: "/purchases", label: "خرید", icon: ShoppingCart },
  { to: "/suppliers", label: "تأمین‌کنندگان", icon: Truck },
  { to: "/sales", label: "فروش", icon: Receipt },
  { to: "/customers", label: "مشتریان", icon: Users },
  { to: "/invoices", label: "فاکتورها", icon: FileText },
  { to: "/currencies", label: "نرخ ارز", icon: Coins },
  { to: "/accounting", label: "حسابداری", icon: Calculator },
  { to: "/expenses", label: "هزینه‌ها", icon: Wallet },
  { to: "/reports", label: "گزارش‌ها", icon: BarChart3 },
  { to: "/users", label: "کاربران و دسترسی", icon: ShieldCheck },
  { to: "/settings", label: "تنظیمات", icon: Settings },
] as const;

const GROUPS: { title: string; items: string[] }[] = [
  { title: "اصلی", items: ["/", "/reports"] },
  { title: "کالا و انبار", items: ["/price-list", "/products", "/categories", "/variants", "/inventory"] },
  { title: "خرید و فروش", items: ["/sales", "/invoices", "/customers", "/purchases", "/suppliers"] },
  { title: "مالی", items: ["/currencies", "/accounting", "/expenses"] },
  { title: "سیستم", items: ["/users", "/settings"] },
];
const isActive = (to: string, path: string) => (to === "/" ? path === "/" : path.startsWith(to));

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState(false);
  const [dark, setDark] = useState(false);
  const [cmd, setCmd] = useState(false);
  const [q, setQ] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { setAuthed(USE_MOCK || !!auth.get()); const f = () => setAuthed(false); window.addEventListener("auth:logout", f); return () => window.removeEventListener("auth:logout", f); }, []);
  useEffect(() => { setDark(localStorage.getItem("theme") === "dark"); setMini(localStorage.getItem("mini") === "1"); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => { localStorage.setItem("mini", mini ? "1" : "0"); }, [mini]);
  useEffect(() => { setOpen(false); setCmd(false); }, [path]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); setQ(""); } if (e.key === "Escape") setCmd(false); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, []);
  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  const current = NAV.find((n) => isActive(n.to, path));
  const hits = NAV.filter((n) => n.label.includes(q.trim()));
  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn("fixed inset-y-0 right-0 z-40 flex shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", mini ? "w-64 lg:w-[76px]" : "w-64", open ? "translate-x-0 shadow-2xl" : "translate-x-full")}>
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-lg font-black text-primary-foreground shadow-glow">T</div>
          <div className={cn("min-w-0 transition-opacity", mini && "lg:hidden")}><div className="text-sm font-black tracking-tight">تتو ERP</div><div className="truncate text-[10px] opacity-55">مدیریت هوشمند فروشگاه</div></div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className={cn("mb-1.5 px-3 text-[10px] font-bold tracking-widest opacity-40", mini && "lg:text-center lg:px-0")}>{mini ? <span className="hidden lg:inline">•••</span> : null}<span className={cn(mini && "lg:hidden")}>{g.title}</span></div>
              <div className="space-y-0.5">
                {g.items.map((to) => { const n = NAV.find((x) => x.to === to)!; const active = isActive(n.to, path); return (
                  <Link key={n.to} to={n.to} title={n.label} className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200", mini && "lg:justify-center lg:px-0", active ? "bg-sidebar-accent font-bold text-sidebar-foreground" : "opacity-70 hover:bg-sidebar-accent/60 hover:opacity-100")}>
                    {active && <span className="absolute inset-y-2 -right-3 w-1 rounded-l-full bg-gradient-primary" />}
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition", active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "group-hover:scale-110")}><n.icon className="size-4" /></span>
                    <span className={cn("truncate", mini && "lg:hidden")}>{n.label}</span>
                  </Link>); })}
              </div>
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-sidebar-border p-3 lg:block">
          <button onClick={() => setMini(!mini)} className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs opacity-60 transition hover:bg-sidebar-accent hover:opacity-100"><ChevronsRight className={cn("size-4 transition-transform", mini && "rotate-180")} />{!mini && "جمع کردن منو"}</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/75 px-4 backdrop-blur-xl lg:px-8">
          <button className="grid size-10 place-items-center rounded-xl border bg-card lg:hidden" onClick={() => setOpen(true)} aria-label="منو"><Menu className="size-5" /></button>
          <div className="min-w-0"><div className="text-[11px] text-muted-foreground">تتو ERP</div><div className="truncate text-sm font-bold">{current?.label}</div></div>
          <button onClick={() => { setCmd(true); setQ(""); }} className="ms-auto flex h-10 items-center gap-2 rounded-xl border bg-card px-3 text-sm text-muted-foreground shadow-sm transition hover:border-ring/50 sm:w-72"><Search className="size-4" /><span className="hidden sm:inline">جستجوی سریع بخش‌ها…</span><kbd dir="ltr" className="ms-auto hidden rounded-md border bg-muted px-1.5 text-[10px] sm:inline">Ctrl K</kbd></button>
          {USE_MOCK && <span className="hidden rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning ring-1 ring-warning/30 md:inline">داده آزمایشی</span>}
          <button onClick={() => setDark(!dark)} className="grid size-10 place-items-center rounded-xl border bg-card transition hover:bg-muted" aria-label="تغییر تم">{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
          {!USE_MOCK && <button onClick={() => auth.clear()} className="grid size-10 place-items-center rounded-xl border bg-card transition hover:bg-destructive/10 hover:text-destructive" aria-label="خروج"><LogOut className="size-4" /></button>}
        </header>
        <main key={path} className="animate-fade-up mx-auto w-full max-w-[1600px] flex-1 p-4 pb-24 lg:p-8">{children}</main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border bg-card/90 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
        {(["/", "/sales", "/price-list", "/inventory"] as const).map((to) => { const n = NAV.find((x) => x.to === to)!; const a = isActive(to, path); return <Link key={to} to={to} className={cn("flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] transition", a ? "bg-accent font-bold text-accent-foreground" : "text-muted-foreground")}><n.icon className="size-5" />{n.label}</Link>; })}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] text-muted-foreground"><Menu className="size-5" />بیشتر</button>
      </nav>
      {cmd && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 p-4 pt-[12vh] backdrop-blur-md" onMouseDown={() => setCmd(false)}>
          <div className="animate-pop w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b px-4"><Search className="size-4 text-muted-foreground" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) { e.currentTarget.blur(); (document.getElementById("cmd-0") as HTMLAnchorElement | null)?.click(); } }} placeholder="نام بخش را بنویسید…" className="h-14 flex-1 bg-transparent text-sm outline-none" /></div>
            <div className="max-h-80 overflow-y-auto p-2">
              {hits.map((n, i) => <Link id={`cmd-${i}`} key={n.to} to={n.to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-accent"><span className="grid size-8 place-items-center rounded-lg bg-muted"><n.icon className="size-4" /></span>{n.label}</Link>)}
              {!hits.length && <div className="p-6 text-center text-sm text-muted-foreground">بخشی پیدا نشد</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
