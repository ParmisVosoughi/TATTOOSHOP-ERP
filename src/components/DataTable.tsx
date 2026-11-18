import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { matches, num } from "@/lib/format";
import { Input, Select } from "./ui";

export interface Column<T> { key: string; header: string; cell: (r: T) => ReactNode; sort?: (r: T) => number | string; className?: string }
interface Props<T> {
  rows: T[]; columns: Column<T>[]; getId: (r: T) => string; search?: (r: T) => string;
  filters?: ReactNode; toolbar?: ReactNode; selected?: Set<string>; onSelect?: (s: Set<string>) => void;
  pageSize?: number; infinite?: boolean; rowClass?: (r: T) => string; empty?: string;
}
export function DataTable<T>({ rows, columns, getId, search, filters, toolbar, selected, onSelect, pageSize = 15, infinite, rowClass, empty = "موردی یافت نشد" }: Props<T>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [pg, setPg] = useState(0);
  const [size, setSize] = useState(pageSize);
  const data = useMemo(() => {
    let r = rows;
    if (q.trim() && search) r = r.filter((x) => matches(search(x), q));
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sort) r = [...r].sort((a, b) => { const x = col.sort!(a), y = col.sort!(b); return (x > y ? 1 : x < y ? -1 : 0) * sort!.dir; });
    return r;
  }, [rows, q, sort, columns, search]);
  const pages = Math.max(1, Math.ceil(data.length / size));
  const cur = Math.min(pg, pages - 1);
  const [shown, setShown] = useState(40); const sentinel = useRef<HTMLTableRowElement>(null); const box = useRef<HTMLDivElement>(null);
  const view = infinite ? data.slice(0, shown) : data.slice(cur * size, cur * size + size);
  useEffect(() => { setShown(40); }, [q, sort]);
  useEffect(() => {
    if (!infinite || typeof IntersectionObserver === "undefined" || !sentinel.current) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setShown((n) => n + 40), { root: box.current, rootMargin: "200px" });
    io.observe(sentinel.current); return () => io.disconnect();
  }, [infinite, view.length]);
  const allSel = !!selected && view.length > 0 && view.every((r) => selected.has(getId(r)));
  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); onSelect?.(s); };
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 p-3 sm:p-4">
        {search && <Input placeholder="جستجو…" value={q} onChange={(e) => { setQ(e.target.value); setPg(0); }} className="w-full sm:w-64" />}
        {filters}
        <div className="ms-auto flex flex-wrap items-center gap-2">{toolbar}</div>
      </div>
      <div ref={box} className={cn("overflow-x-auto", infinite && "max-h-[70vh] overflow-y-auto")}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur shadow-[0_1px_0_var(--color-border)]">
            <tr>
              {selected && <th className="w-8 p-2"><input type="checkbox" className="size-4 cursor-pointer accent-primary" checked={allSel} onChange={() => { const s = new Set(selected); view.forEach((r) => (allSel ? s.delete(getId(r)) : s.add(getId(r)))); onSelect?.(s); }} /></th>}
              {columns.map((c) => (
                <th key={c.key} onClick={() => c.sort && setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}
                  className={cn("whitespace-nowrap px-4 py-3 text-start font-bold", c.sort && "cursor-pointer select-none hover:text-foreground", c.className)}>
                  {c.header}{sort?.key === c.key && (sort.dir === 1 ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={getId(r)} className={cn("border-t transition-colors hover:bg-accent/50", selected?.has(getId(r)) && "bg-accent/50", rowClass?.(r))}>
                {selected && <td className="p-2"><input type="checkbox" className="size-4 cursor-pointer accent-primary" checked={selected.has(getId(r))} onChange={() => toggle(getId(r))} /></td>}
                {columns.map((c) => <td key={c.key} className={cn("whitespace-nowrap px-3 py-2.5", c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
            {infinite && view.length < data.length && <tr ref={sentinel}><td colSpan={columns.length + 1} className="p-3 text-center text-xs text-muted-foreground">در حال بارگذاری بیشتر…</td></tr>}
            {!view.length && <tr><td colSpan={columns.length + 1} className="p-8 text-center text-muted-foreground">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 border-t p-2.5 text-xs text-muted-foreground">
        <span>{num(data.length)} ردیف{selected?.size ? ` · ${num(selected.size)} انتخاب‌شده` : ""}</span>
        {!infinite && <div className="flex items-center gap-1.5">
          <Select value={size} onChange={(e) => { setSize(+e.target.value); setPg(0); }} className="h-7 w-16 px-1 text-xs">{[15, 30, 50, 100].map((n) => <option key={n} value={n}>{num(n)}</option>)}</Select>
          <button disabled={cur === 0} onClick={() => setPg(cur - 1)} className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-40">قبلی</button>
          <span>{num(cur + 1)} / {num(pages)}</span>
          <button disabled={cur >= pages - 1} onClick={() => setPg(cur + 1)} className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-40">بعدی</button>
        </div>}
      </div>
    </div>
  );
}
