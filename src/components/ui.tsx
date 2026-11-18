import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent as KbEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { groupDigits, matches, toEnDigits } from "@/lib/format";

const btn = {
  primary: "bg-gradient-primary text-primary-foreground shadow-glow hover:-translate-y-px hover:brightness-110",
  outline: "border bg-card shadow-sm hover:bg-muted hover:border-ring/40",
  ghost: "hover:bg-muted",
  danger: "bg-destructive text-destructive-foreground hover:opacity-90",
};
export function Button({ variant = "primary", size = "md", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof btn; size?: "sm" | "md" }) {
  return <button {...p} className={cn("inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition duration-200 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50", size === "sm" ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm", btn[variant], className)} />;
}
const fmtVal = (v: unknown) => (v == null || v === "" ? "" : groupDigits(String(v)));
/** Numeric text input with live thousands separators (keeps the caret in place); onChange receives the raw number string (no commas). */
function NumberInput({ value, onChange, className, type: _t, min: _mn, max: _mx, step: _st, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  const [txt, setTxt] = useState(fmtVal(value)); const ref = useRef<HTMLInputElement>(null); const caret = useRef<number | null>(null);
  useEffect(() => { const ext = Number(value ?? 0); const cur = Number(txt.replace(/,/g, "") || 0); if (ext !== cur || (value === "" && txt !== "")) setTxt(fmtVal(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (caret.current !== null && ref.current && document.activeElement === ref.current) ref.current.setSelectionRange(caret.current, caret.current); caret.current = null; });
  return <input {...p} ref={ref} inputMode="decimal" dir="ltr" value={txt} className={cn("input-base tabular-nums", className)} onChange={(e) => {
    const el = e.target; const pos = el.selectionStart ?? el.value.length;
    const digitsBefore = toEnDigits(el.value.slice(0, pos)).replace(/,/g, "").length;
    const raw = toEnDigits(el.value).replace(/,/g, "");
    if (!/^-?\d*\.?\d*$/.test(raw)) return;
    const g = groupDigits(raw); let seen = 0, at = 0; while (at < g.length && seen < digitsBefore) { if (g[at] !== ",") seen++; at++; }
    caret.current = at; setTxt(g);
    onChange?.({ target: { value: raw }, currentTarget: { value: raw } } as unknown as ChangeEvent<HTMLInputElement>);
  }} />;
}
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => p.type === "number" ? <NumberInput {...p} className={className} /> : <input {...p} className={cn("input-base", className)} />;

export interface Opt { value: string; label: string; /** extra searchable text (brand, SKU, barcode …) */ search?: string }
/** Searchable select with keyboard navigation and optional clear. `pinned` options are always listed last (e.g. walk-in customer). */
export function SearchSelect({ value, onChange, options, pinned = [], placeholder = "جستجو و انتخاب…", className, ariaLabel, clearable }: { value: string; onChange: (v: string) => void; options: Opt[]; pinned?: Opt[]; placeholder?: string; className?: string; ariaLabel?: string; clearable?: boolean }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(""); const [act, setAct] = useState(0); const ref = useRef<HTMLDivElement>(null);
  const all = useMemo(() => [...options, ...pinned], [options, pinned]);
  const cur = all.find((o) => o.value === value);
  const hit = (o: Opt) => matches(`${o.label} ${o.search ?? ""}`, q);
  const list = useMemo(() => (q.trim() ? options.filter(hit) : options).slice(0, 80).concat(q.trim() ? pinned.filter(hit) : pinned), [options, pinned, q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setQ(""); } }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [open]);
  useEffect(() => { setAct(0); }, [q, open]);
  const pick = (v: string) => { onChange(v); setOpen(false); setQ(""); };
  const key = (e: KbEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setAct((i) => Math.min(i + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAct((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (open && list[act]) pick(list[act]!.value); }
    else if (e.key === "Escape") { setOpen(false); setQ(""); }
  };
  return (
    <div ref={ref} className={cn("relative", className)}>
      <input aria-label={ariaLabel} role="combobox" aria-expanded={open} className={cn("input-base w-full", clearable && value && "pe-7")} placeholder={cur ? cur.label : placeholder} value={open ? q : cur?.label ?? ""} onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onKeyDown={key} />
      {clearable && value && <button type="button" aria-label="پاک کردن" onMouseDown={(e) => { e.preventDefault(); pick(""); }} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">✕</button>}
      {open && <ul role="listbox" className="absolute z-40 mt-1 max-h-60 w-full min-w-48 overflow-y-auto rounded-xl border bg-card p-1 text-sm shadow-xl">
        {list.map((o, i) => <li key={o.value + i} role="option" aria-selected={o.value === value} onMouseDown={(e) => { e.preventDefault(); pick(o.value); }} onMouseEnter={() => setAct(i)}
          className={cn("cursor-pointer rounded-lg px-2.5 py-2 hover:bg-muted", o.value === value && "bg-accent", i === act && "bg-muted", i === options.slice(0, 80).length && pinned.length > 0 && !q && "border-t")}>{o.label}</li>)}
        {!list.length && <li className="px-2.5 py-2 text-muted-foreground">موردی یافت نشد</li>}
      </ul>}
    </div>
  );
}
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn("input-base", className)}>{children}</select>;
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <label className={cn("flex flex-col gap-1.5 text-xs font-medium text-muted-foreground", className)}>{label}{children}</label>;
}
export function Card({ title, actions, children, className, icon, bodyClassName }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; icon?: ReactNode; bodyClassName?: string }) {
  return (
    <section className={cn("animate-fade-up rounded-2xl border bg-card shadow-card transition-shadow hover:shadow-lg", className)}>
      {title && <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-3"><h3 className="flex items-center gap-2 text-sm font-bold">{icon && <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-foreground [&_svg]:size-4">{icon}</span>}{title}</h3>{actions}</header>}
      <div className={cn("px-5 pb-5", !title && "pt-5", bodyClassName)}>{children}</div>
    </section>
  );
}
const tones = { neutral: "bg-muted text-muted-foreground ring-border", success: "bg-success/12 text-success ring-success/25", warning: "bg-warning/15 text-warning ring-warning/30", danger: "bg-destructive/12 text-destructive ring-destructive/25", primary: "bg-accent text-accent-foreground ring-primary/20" };
export type Tone = keyof typeof tones;
export const Badge = ({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) => <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset", tones[tone])}>{children}</span>;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="animate-fade-up mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function Stat({ label, value, hint, tone, icon, delay = 0 }: { label: string; value: string; hint?: string; tone?: "success" | "danger"; icon?: ReactNode; delay?: number }) {
  return (
    <div style={{ animationDelay: `${delay}ms` }} className="animate-fade-up group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-glow sm:p-5">
      <div className="pointer-events-none absolute -top-10 -start-10 size-32 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {icon && <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow [&_svg]:size-4">{icon}</div>}
      </div>
      <div className="relative mt-2 text-base font-black tabular-nums whitespace-nowrap sm:text-xl 2xl:text-2xl">{value}</div>
      {hint && <div className={cn("relative mt-1 text-xs font-medium", tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-muted-foreground")}>{hint}</div>}
    </div>
  );
}
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", k); const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; }; }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-foreground/40 backdrop-blur-md sm:items-start sm:p-4" onMouseDown={onClose}>
      <div className={cn("animate-pop w-full rounded-t-3xl border bg-card shadow-2xl sm:my-10 sm:rounded-3xl", wide ? "max-w-5xl" : "max-w-lg")} onMouseDown={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b bg-card/95 px-5 py-4 backdrop-blur"><h2 className="text-base font-bold">{title}</h2><button onClick={onClose} aria-label="بستن" className="grid size-9 place-items-center rounded-xl text-muted-foreground transition hover:rotate-90 hover:bg-muted hover:text-foreground">✕</button></header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
export function Bars({ data, format }: { data: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.label} className="text-xs">
          <div className="mb-1.5 flex justify-between gap-2"><span className="truncate font-medium">{d.label}</span><span className="tabular-nums text-muted-foreground">{format(d.value)}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={cn("animate-grow-x h-full rounded-full", d.value < 0 ? "bg-destructive" : "bg-gradient-primary")} style={{ width: `${(Math.abs(d.value) / max) * 100}%`, animationDelay: `${i * 70}ms` }} /></div>
        </div>
      ))}
    </div>
  );
}
export const Loading = () => (
  <div className="space-y-4" aria-label="در حال بارگذاری…">
    <div className="skeleton h-9 w-48" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
    <div className="skeleton h-72 rounded-2xl" />
  </div>
);
