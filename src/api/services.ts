// Service layer: each function hits the Django REST API, or the isolated mock when no base URL is set.
import { http, USE_MOCK } from "./client";
import { db, dashboard, accounting, uid, genBarcode, genProductSku, genInvoiceCode, genTxRef, genSaleNumber, genPurchaseNumber, genMovementRef } from "./mock";
import type * as T from "./types";
import { applyStock, unitFactor, unitsOf } from "@/lib/inventory";
import { invoiceTotal, paymentStatusOf, toRial } from "@/lib/money";

const wait = <R,>(fn: () => R) => new Promise<R>((res, rej) => setTimeout(() => { try { res(structuredClone(fn())); } catch (e) { rej(e); } }, 120));
const call = <R,>(path: string, mock: () => R, init?: RequestInit) => (USE_MOCK ? wait(mock) : http<R>(path, init));
const body = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });
const now = () => new Date().toISOString();
const findP = (id: string) => { for (const p of db.products) { const v = p.variants.find((x) => x.id === id); if (v) return { p, v }; } throw new Error("کالا یافت نشد"); };
const findV = (id: string) => findP(id).v;
const baseUnit = (p: T.Product) => p.units[0]?.name ?? "عدد";
const cashAccount = () => db.accounts.find((a) => a.type === "cash") ?? db.accounts[0];

/** Mock-only: running balance of one account, rebuilt chronologically (amount in Rial, balance in Toman). */
function rebuild(a: T.Account) {
  let rial = 0;
  db.accountTx.filter((t) => t.accountId === a.id).sort((x, y) => x.date.localeCompare(y.date) || (x.createdAt ?? "").localeCompare(y.createdAt ?? "") || (x.seq ?? 0) - (y.seq ?? 0))
    .forEach((t) => { rial += t.type === "deposit" ? t.amount : -t.amount; t.balanceAfter = rial / 10; });
  a.balance = rial / 10;
}
let txOrder = 100000;
/** Mock-only: records a transaction (dated `date`, default now) and recomputes running balances. Every balance change goes through here. */
function postTx(accountId: string, type: "deposit" | "withdraw", rial: number, description: string, o: { ref?: string; invoiceId?: string; date?: string } = {}): T.AccountTx {
  const a = db.accounts.find((x) => x.id === accountId); if (!a) throw new Error("حساب یافت نشد");
  if (!(rial > 0) || !Number.isFinite(rial)) throw new Error("مبلغ نامعتبر است");
  const ref = o.ref?.trim() || genTxRef();
  if (db.accountTx.some((t) => t.ref === ref)) throw new Error("این کد تراکنش قبلاً ثبت شده است");
  const t: T.AccountTx = { id: uid(), accountId, date: o.date ?? now(), createdAt: now(), seq: ++txOrder, type, amount: Math.round(rial), description, ref, code: a.code ?? "", balanceAfter: 0, ...(o.invoiceId ? { invoiceId: o.invoiceId } : {}) };
  db.accountTx.unshift(t); rebuild(a);
  if (db.accountTx.some((x) => x.accountId === a.id && x.balanceAfter < 0)) { db.accountTx = db.accountTx.filter((x) => x !== t); rebuild(a); throw new Error("موجودی حساب کافی نیست"); }
  return t;
}

/** Mock-only: keeps the accounting and dashboard summaries in step with every operation. */
function bump(d: { sales?: number; cogs?: number; purchases?: number; receivables?: number; payables?: number }) {
  const pnl = accounting.pnl;
  pnl[0]!.value += d.sales ?? 0; pnl[1]!.value -= d.cogs ?? 0; pnl[2]!.value = pnl[0]!.value + pnl[1]!.value; pnl[4]!.value = pnl[2]!.value + pnl[3]!.value;
  accounting.income += d.sales ?? 0; accounting.receivables += d.receivables ?? 0; accounting.payables += d.payables ?? 0;
  dashboard.totalSales += d.sales ?? 0; dashboard.totalPurchases += d.purchases ?? 0; dashboard.estimatedProfit = pnl[4]!.value;
}
function bumpStock(categoryId: string, delta: number) {
  dashboard.inventoryValue += delta; const cat = db.categories.find((c) => c.id === categoryId);
  const row = cat && accounting.inventoryValuation.find((v) => cat.name.includes(v.category) || v.category.includes(cat.name)); if (row) row.value += delta;
}
const costOf = (p: T.Product, v: T.Variant, unit: string, qty: number) => qty * unitFactor(p, v, unit) * v.purchasePrice * v.baseRate;

/** Mock-only: registers a sales/return invoice with stock, movements, payment and balances all connected. */
function createSale(s: Omit<T.SalesInvoice, "id" | "code">): T.SalesInvoice {
  if (s.clientKey) { const dup = db.sales.find((x) => x.clientKey === s.clientKey); if (dup) return dup; }
  const cust = db.customers.find((c) => c.id === s.customerId); if (!cust) throw new Error("مشتری یافت نشد");
  s.items.forEach((i) => { if (!(i.qty > 0)) throw new Error("تعداد باید بیشتر از صفر باشد"); if (i.unitPrice < 0 || i.discount < 0) throw new Error("قیمت یا تخفیف نامعتبر است"); });
  const total = s.items.length ? invoiceTotal(s.items, s.type) : s.total; const abs = Math.abs(total);
  const paid = Math.min(abs, Math.max(0, s.paymentStatus === "paid" || s.paymentStatus === "refunded" ? abs : s.paymentStatus === "partial" ? s.paidAmount ?? 0 : 0));
  const undo: (() => void)[] = []; const number = s.number || genSaleNumber(s.type); const code = genInvoiceCode();
  try {
    const moves: T.StockMovement[] = []; let cogs = 0; const val = new Map<string, number>();
    s.items.forEach((i) => { const { p, v } = findP(i.variantId); undo.push(applyStock(p, v, i.unit, s.type === "sale" ? -i.qty : i.qty)); const c = costOf(p, v, i.unit, i.qty); cogs += c; val.set(p.categoryId, (val.get(p.categoryId) ?? 0) + c);
      moves.push({ id: uid(), date: now(), variantId: v.id, type: s.type === "sale" ? "out" : "return", qty: i.qty, unit: i.unit, ref: number }); });
    const acc = paid > 0 ? (db.accounts.find((a) => a.id === s.accountId) ?? cashAccount()) : undefined;
    if (paid > 0 && !acc) throw new Error("حساب دریافت وجه یافت نشد");
    const n: T.SalesInvoice = { ...s, id: uid(), code, number, total, paymentStatus: paymentStatusOf(total, paid, s.type), paidAmount: paid, outstanding: abs - paid, ...(acc ? { accountId: acc.id } : {}) };
    if (acc) postTx(acc.id, s.type === "sale" ? "deposit" : "withdraw", toRial(paid), `${s.type === "sale" ? "دریافت وجه" : "استرداد وجه"} فاکتور ${number}`, { invoiceId: n.id });
    db.sales.unshift(n); db.movements.unshift(...moves);
    const out = abs - paid; const dBal = s.type === "sale" ? out : -out; cust.balance += dBal;
    const sign = s.type === "sale" ? 1 : -1;
    bump({ sales: total, cogs: sign * cogs, receivables: dBal });
    val.forEach((c, categoryId) => bumpStock(categoryId, -sign * c));
    return n;
  } catch (e) { undo.reverse().forEach((u) => u()); throw e; }
}

/** Mock-only: registers a payment/refund on an invoice (never above what is outstanding) with its ledger transaction. */
function payInvoice(s: T.SalesInvoice, amount: number, acc: T.Account) {
  const out = s.outstanding ?? 0; if (!(amount > 0)) throw new Error("مبلغ نامعتبر است"); if (amount > out) throw new Error("مبلغ بیشتر از مانده فاکتور است");
  postTx(acc.id, s.type === "sale" ? "deposit" : "withdraw", toRial(amount), `${s.type === "sale" ? "دریافت وجه" : "استرداد وجه"} فاکتور ${s.number}`, { invoiceId: s.id });
  s.paidAmount = (s.paidAmount ?? 0) + amount; s.outstanding = out - amount; s.paymentStatus = paymentStatusOf(s.total, s.paidAmount, s.type); s.accountId = acc.id;
  const cust = db.customers.find((c) => c.id === s.customerId); const dBal = s.type === "sale" ? -amount : amount; if (cust) cust.balance += dBal; bump({ receivables: dBal });
}

export const api = {
  dashboard: () => call<T.DashboardSummary>("/api/dashboard/", () => dashboard),
  accounting: () => call<T.AccountingSummary>("/api/accounting/summary/", () => accounting),

  categories: {
    list: () => call<T.Category[]>("/api/categories/", () => db.categories),
    save: (c: Partial<T.Category> & { name: string }) =>
      call<T.Category>(c.id ? `/api/categories/${c.id}/` : "/api/categories/", () => {
        if (c.id) { const x = db.categories.find((k) => k.id === c.id)!; Object.assign(x, c); return x; }
        const n = { id: uid(), parentId: null, ...c } as T.Category; db.categories.push(n); return n;
      }, body(c.id ? "PATCH" : "POST", c)),
    remove: (id: string) => call<void>(`/api/categories/${id}/`, () => { db.categories = db.categories.filter((c) => c.id !== id && c.parentId !== id); }, { method: "DELETE" }),
  },

  products: {
    list: () => call<T.Product[]>("/api/products/", () => db.products),
    save: (p: T.Product) => call<T.Product>(p.id ? `/api/products/${p.id}/` : "/api/products/", () => {
      // Backend contract: blank product SKU / variant SKU / barcode are generated server-side, are unique and stay with the product.
      const id = p.id || uid(); const old = db.products.find((x) => x.id === id);
      const others = db.products.filter((x) => x.id !== id);
      const skus = new Set(others.flatMap((x) => [x.sku, ...x.variants.map((v) => v.sku)])); const codes = new Set(db.products.flatMap((x) => x.variants.map((v) => v.barcode)));
      let sku = p.sku?.trim() || old?.sku || "";
      if (sku && others.some((x) => x.sku === sku)) throw new Error("این SKU قبلاً برای محصول دیگری استفاده شده است");
      while (!sku || skus.has(sku)) sku = genProductSku();
      skus.add(sku);
      const usedHere = new Set<string>(); const rate = (c: T.CurrencyCode) => db.rates.find((r) => r.code === c)?.rate ?? 1;
      const variants = p.variants.map((v) => {
        const prev = old?.variants.find((x) => x.id === v.id);
        let vs = v.sku?.trim() || prev?.sku || "";
        if (vs && (skus.has(vs) || usedHere.has(vs))) throw new Error(`SKU تکراری: ${vs}`);
        for (let n = 1; !vs; n++) { const c = `${sku}-${n}`; if (!skus.has(c) && !usedHere.has(c) && !old?.variants.some((x) => x.id !== v.id && x.sku === c)) vs = c; }
        usedHere.add(vs);
        let bc = v.barcode?.trim() || prev?.barcode || "";
        if (bc && db.products.some((x) => x.variants.some((y) => y.barcode === bc && y.id !== v.id))) throw new Error(`بارکد تکراری: ${bc}`);
        while (!bc || codes.has(bc)) bc = genBarcode();
        codes.add(bc);
        // new foreign-currency variants start from the current rate so they never show a fake price change
        const baseRate = prev ? v.baseRate : v.currency !== "IRT" && (!v.baseRate || v.baseRate === 1) ? rate(v.currency) : v.baseRate || 1;
        return { ...v, id: v.id || uid(), productId: id, sku: vs, barcode: bc, baseRate };
      });
      const n = { ...p, id, sku, variants };
      db.products = old ? db.products.map((x) => (x.id === id ? n : x)) : [...db.products, n];
      return n;
    }, body(p.id ? "PUT" : "POST", p)),
    remove: (id: string) => call<void>(`/api/products/${id}/`, () => { db.products = db.products.filter((p) => p.id !== id); }, { method: "DELETE" }),
  },

  variants: {
    setPrice: (id: string, price: number) => call<void>(`/api/variants/${id}/price/`, () => {
      const v = findV(id); v.sellingPrice = price; v.updatedAt = now(); v.priceHistory.push({ date: now(), price });
    }, body("POST", { price })),
    bulkAdjust: (ids: string[], percent: number) => call<void>("/api/variants/bulk-adjust/", () => {
      ids.forEach((id) => { const v = findV(id); if (v.locked) return; v.sellingPrice = +(v.sellingPrice * (1 + percent / 100)).toFixed(2); v.updatedAt = now(); v.priceHistory.push({ date: now(), price: v.sellingPrice }); });
    }, body("POST", { ids, percent })),
    setLock: (ids: string[], locked: boolean) => call<void>("/api/variants/lock/", () => { ids.forEach((id) => (findV(id).locked = locked)); }, body("POST", { ids, locked })),
    addUnit: (id: string, name: string, factor: number) => call<void>(`/api/variants/${id}/units/`, () => undefined, body("POST", { name, factor })),
    setOverride: (id: string, value: number | null) => call<void>(`/api/variants/${id}/override/`, () => { findV(id).manualOverride = value; }, body("POST", { value })),
  },

  rates: {
    list: () => call<T.CurrencyRate[]>("/api/currency-rates/", () => db.rates),
    update: (code: T.CurrencyCode, rate: number) => call<void>(`/api/currency-rates/${code}/`, () => {
      const r = db.rates.find((x) => x.code === code); if (!r || code === "IRT") throw new Error("ارز نامعتبر است");
      if (!(rate > 0) || !Number.isFinite(rate)) throw new Error("نرخ ارز باید بزرگ‌تر از صفر باشد"); r.previousRate = r.rate; r.rate = rate; r.updatedAt = now(); r.history.push({ date: now(), rate });
    }, body("POST", { rate })),
    /** Makes the calculated (green/red) prices the new base prices; locked variants and manual prices are untouched. */
    apply: (code: T.CurrencyCode) => call<void>(`/api/currency-rates/${code}/apply/`, () => {
      const r = db.rates.find((x) => x.code === code); if (!r || !(r.rate > 0)) throw new Error("نرخ ارز نامعتبر است");
      db.products.forEach((p) => p.variants.forEach((v) => { if (v.currency === code && !v.locked && v.manualOverride == null) { v.baseRate = r.rate; v.updatedAt = now(); } }));
    }, body("POST", {})),
  },

  suppliers: {
    list: () => call<T.Party[]>("/api/suppliers/", () => db.suppliers),
    create: (p: Omit<T.Party, "id" | "balance">) => call<T.Party>("/api/suppliers/", () => { const n = { ...p, id: uid(), balance: 0 }; db.suppliers.push(n); return n; }, body("POST", p)),
  },
  customers: {
    list: () => call<T.Party[]>("/api/customers/", () => db.customers),
    create: (p: Omit<T.Party, "id" | "balance">) => call<T.Party>("/api/customers/", () => { if (p.name.trim() === "مشتری گذری" || p.code === "920") throw new Error("مشتری گذری (کد ۹۲۰) فقط یک حساب دائمی دارد"); const n = { ...p, id: uid(), balance: 0 }; db.customers.push(n); return n; }, body("POST", p)),
  },
  purchases: {
    list: () => call<T.PurchaseInvoice[]>("/api/purchases/", () => db.purchases),
    create: (p: Omit<T.PurchaseInvoice, "id" | "number"> & { number?: string }) => call<T.PurchaseInvoice>("/api/purchases/", () => {
      if (p.clientKey) { const dup = db.purchases.find((x) => x.clientKey === p.clientKey); if (dup) return dup; }
      if (!p.items.length) throw new Error("حداقل یک کالا انتخاب کنید");
      const sup = p.supplierId ? db.suppliers.find((x) => x.id === p.supplierId) : undefined; if (p.supplierId && !sup) throw new Error("تأمین‌کننده یافت نشد");
      p.items.forEach((i) => { if (!i.variantId) throw new Error("کالای هر ردیف را انتخاب کنید"); if (!(i.qty > 0)) throw new Error("تعداد باید بیشتر از صفر باشد"); if (i.unitPrice < 0) throw new Error("قیمت واحد نامعتبر است"); });
      const rate = p.rate > 0 ? p.rate : db.rates.find((r) => r.code === p.currency)?.rate ?? 1;
      const total = Math.round(p.items.reduce((t, i) => t + i.qty * i.unitPrice, 0) * rate + (p.shipping || 0) + (p.customs || 0) + (p.commission || 0) + (p.other || 0) - (p.discount || 0));
      if (total < 0) throw new Error("مبلغ نهایی منفی است"); const paid = Math.min(total, Math.max(0, p.paidAmount ?? 0));
      const undo: (() => void)[] = []; const number = p.number || genPurchaseNumber();
      try {
        const moves: T.StockMovement[] = []; const val = new Map<string, number>(); let goods = 0;
        p.items.forEach((i) => { const { p: pr, v } = findP(i.variantId); undo.push(applyStock(pr, v, baseUnit(pr), i.qty)); const c = i.qty * i.unitPrice * rate; goods += c; val.set(pr.categoryId, (val.get(pr.categoryId) ?? 0) + c);
          moves.push({ id: uid(), date: now(), variantId: v.id, type: "in", qty: i.qty, unit: baseUnit(pr), ref: number }); });
        const acc = paid > 0 ? (db.accounts.find((a) => a.id === p.accountId) ?? cashAccount()) : undefined;
        const n: T.PurchaseInvoice = { ...p, id: uid(), number, rate, total, paidAmount: paid, status: "received", code: genInvoiceCode().replace("F", "PI"), ...(acc ? { accountId: acc.id } : {}) };
        if (acc) postTx(acc.id, "withdraw", toRial(paid), `پرداخت خرید ${number}`, { invoiceId: n.id });
        db.purchases.unshift(n); db.movements.unshift(...moves);
        if (sup) sup.balance -= total - paid;
        bump({ purchases: total, payables: sup ? total - paid : 0 }); val.forEach((c, cat) => bumpStock(cat, c));
        return n;
      } catch (e) { undo.reverse().forEach((u) => u()); throw e; }
    }, body("POST", p)),
  },
  sales: {
    list: () => call<T.SalesInvoice[]>("/api/sales/", () => db.sales),
    create: (s: Omit<T.SalesInvoice, "id" | "code" | "number"> & { number?: string }) => call<T.SalesInvoice>("/api/sales/", () => createSale(s as Omit<T.SalesInvoice, "id" | "code">), body("POST", s)),
    archive: (id: string, archived = true) => call<void>(`/api/sales/${id}/archive/`, () => { db.sales.find((x) => x.id === id)!.archived = archived; }, body("POST", { archived })),
  },
  movements: { list: () => call<T.StockMovement[]>("/api/stock-movements/", () => db.movements) },
  expenses: {
    list: () => call<T.Expense[]>("/api/expenses/", () => db.expenses),
    create: (e: Omit<T.Expense, "id">) => call<T.Expense>("/api/expenses/", () => { const n = { ...e, id: uid() }; db.expenses.unshift(n); return n; }, body("POST", e)),
  },
  accounts: {
    list: () => call<T.Account[]>("/api/accounts/", () => db.accounts),
    /** Bank accounts get a unique 3-digit code (auto-generated when omitted). Balance is in Toman. */
    create: (a: { name: string; type?: "cash" | "bank"; code?: string; balance?: number }) => call<T.Account>("/api/accounts/", () => {
      if (!a.name.trim()) throw new Error("نام بانک را وارد کنید");
      const used = new Set(db.accounts.map((x) => x.code)); let code = a.code || ""; if (!code) { let k = 101; while (used.has(String(k))) k++; code = String(k); }
      if (!/^\d{3}$/.test(code)) throw new Error("کد حساب باید سه رقم باشد");
      if (used.has(code)) throw new Error("این کد قبلاً استفاده شده است");
      const n: T.Account = { id: uid(), name: a.name.trim(), type: a.type ?? "bank", balance: 0, code, createdAt: now() }; db.accounts.push(n);
      if (a.balance && a.balance > 0) postTx(n.id, "deposit", toRial(a.balance), "موجودی اولیه");
      return n;
    }, body("POST", a)),
    /** Renames an account; its code and history never change. */
    rename: (id: string, name: string) => call<void>(`/api/accounts/${id}/`, () => { const a = db.accounts.find((x) => x.id === id); if (!a || !name.trim()) throw new Error("نام نامعتبر است"); a.name = name.trim(); }, body("PATCH", { name })),
    /** Editing the balance records an adjustment transaction (history is never overwritten). Balance in Toman. */
    setBalance: (id: string, balance: number) => call<void>(`/api/accounts/${id}/`, () => {
      const a = db.accounts.find((x) => x.id === id); if (!a) throw new Error("حساب یافت نشد"); if (!(balance >= 0) || !Number.isFinite(balance)) throw new Error("موجودی نامعتبر است");
      const diff = balance - a.balance; if (diff) postTx(id, diff > 0 ? "deposit" : "withdraw", toRial(Math.abs(diff)), `اصلاح موجودی (از ${a.balance} به ${balance} تومان)`);
    }, body("PATCH", { balance })),
    transactions: (id: string) => call<T.AccountTx[]>(`/api/accounts/${id}/transactions/`, () => db.accountTx.filter((t) => t.accountId === id).sort((x, y) => y.date.localeCompare(x.date) || (y.createdAt ?? "").localeCompare(x.createdAt ?? "") || (y.seq ?? 0) - (x.seq ?? 0))),
    /** amount is in Rial; date (ISO) defaults to now; ref is generated when omitted. */
    addTx: (id: string, t: { type: "deposit" | "withdraw"; amount: number; description: string; date?: string; ref?: string }) => call<T.AccountTx>(`/api/accounts/${id}/transactions/`, () => postTx(id, t.type, t.amount, t.description, { date: t.date, ref: t.ref }), body("POST", t)),
  },
  users: {
    list: () => call<T.AppUser[]>("/api/users/", () => db.users),
    create: (u: Partial<T.AppUser> & { username: string; password: string }) => call<T.AppUser>("/api/users/", () => { const n = { id: uid(), name: "", role: u.roleCode ?? "", permissions: [], active: true, ...u } as T.AppUser; db.users.push(n); return n; }, body("POST", u)),
    update: (id: string, u: Partial<T.AppUser>) => call<T.AppUser>(`/api/users/${id}/`, () => { const x = db.users.find((k) => k.id === id)!; Object.assign(x, u); return x; }, body("PATCH", u)),
  },
  payments: {
    /** Cancels a sale by issuing a full return invoice (stock restored, paid amount refunded). */
    voidSale: (id: string) => call<void>(`/api/sales/${id}/void/`, () => {
      const s = db.sales.find((x) => x.id === id); if (!s || s.type !== "sale") throw new Error("فاکتور فروش یافت نشد"); if (s.voided) throw new Error("این فاکتور قبلاً باطل شده است");
      const back = new Map<string, number>(); db.accountTx.filter((t) => t.invoiceId === s.id && t.type === "deposit").forEach((t) => back.set(t.accountId, (back.get(t.accountId) ?? 0) + t.amount));
      back.forEach((rial, aid) => { const a = db.accounts.find((x) => x.id === aid); if (!a || a.balance * 10 < rial) throw new Error(`موجودی «${a?.name ?? aid}» برای استرداد کافی نیست`); });
      const ret = createSale({ customerId: s.customerId, number: "", date: now(), items: structuredClone(s.items), total: -Math.abs(s.total), type: "return", paymentStatus: "unpaid", returnOf: s.id });
      back.forEach((rial, aid) => payInvoice(ret, rial / 10, db.accounts.find((x) => x.id === aid)!));
      s.voided = true; s.outstanding = 0;
    }, body("POST", {})),
    /** Registers a (partial) payment on an invoice; the amount can never exceed what is still outstanding. */
    sale: (id: string, amount: number, accountId?: string) => call<void>(`/api/sales/${id}/payments/`, () => {
      const s = db.sales.find((x) => x.id === id); if (!s) throw new Error("فاکتور یافت نشد"); if (s.voided) throw new Error("فاکتور باطل شده است");
      const acc = db.accounts.find((a) => a.id === accountId) ?? cashAccount(); if (!acc) throw new Error("حساب یافت نشد"); payInvoice(s, amount, acc);
    }, body("POST", { amount, accountId })),
  },
  inventory: {
    adjust: (d: { variantId: string; quantity: number; unit?: string; note?: string }) => call<void>("/api/inventory/adjust/", () => {
      if (!d.quantity || !Number.isFinite(d.quantity)) throw new Error("مقدار نامعتبر است"); const { p, v } = findP(d.variantId); const unit = d.unit || baseUnit(p);
      applyStock(p, v, unit, d.quantity); db.movements.unshift({ id: uid(), date: now(), variantId: v.id, type: d.quantity > 0 ? "in" : "out", qty: Math.abs(d.quantity), unit, ref: genMovementRef("ADJ"), ...(d.note ? { note: d.note } : {}) });
      bumpStock(p.categoryId, d.quantity * unitFactor(p, v, unit) * v.purchasePrice * v.baseRate);
    }, body("POST", d)),
    transfer: (d: { variantId: string; unit?: string; quantity: number; fromWarehouseId: string; toWarehouseId: string }) => call<void>("/api/inventory/transfer/", () => {
      if (!(d.quantity > 0)) throw new Error("مقدار نامعتبر است"); if (d.fromWarehouseId === d.toWarehouseId) throw new Error("انبار مبدا و مقصد یکسان است");
      const { p, v } = findP(d.variantId); const unit = d.unit || baseUnit(p); if (unitFactor(p, v, unit) * d.quantity > v.stock) throw new Error("موجودی کافی نیست");
      db.movements.unshift({ id: uid(), date: now(), variantId: v.id, type: "transfer", qty: d.quantity, unit, ref: genMovementRef("TRF") });
    }, body("POST", d)),
    /** Independent-inventory products only: moves stock from one pack to another using the exact pack factors. */
    convert: (d: { variantId: string; fromUnit: string; toUnit: string; quantity: number }) => call<void>("/api/inventory/convert/", () => {
      const { p, v } = findP(d.variantId); if (p.inventoryMode !== "independent") throw new Error("تبدیل واحد فقط برای موجودی مستقل ممکن است");
      if (!(d.quantity > 0)) throw new Error("مقدار نامعتبر است"); if (d.fromUnit === d.toUnit) throw new Error("واحد مبدا و مقصد یکسان است");
      const ff = unitFactor(p, v, d.fromUnit), tf = unitFactor(p, v, d.toUnit), toQty = (d.quantity * ff) / tf;
      if (!Number.isInteger(toQty)) throw new Error("مقدار قابل تبدیل دقیق به واحد مقصد نیست");
      const units = unitsOf(p, v); [d.fromUnit, d.toUnit].forEach((n) => { const u = units.find((x) => x.name === n); if (u && u.factor !== 1 && u.stock === undefined) { const own = v.extraUnits?.find((x) => x.name === n) ?? p.units.find((x) => x.name === n); if (own) own.stock = 0; } });
      const u1 = applyStock(p, v, d.fromUnit, -d.quantity); try { applyStock(p, v, d.toUnit, toQty); } catch (e) { u1(); throw e; }
      db.movements.unshift({ id: uid(), date: now(), variantId: v.id, type: "convert", qty: d.quantity, unit: `${d.fromUnit} → ${d.toUnit}`, ref: genMovementRef("CNV") });
    }, body("POST", d)),
  },
  warehouses: { list: () => call<T.Warehouse[]>("/api/warehouses/", () => [{ id: "w1", name: "انبار اصلی", isDefault: true }]) },
  settings: {
    get: () => call<T.StoreSettings>("/api/settings/", () => ({ storeName: "فروشگاه لوازم تتو", taxRate: 0, costingMethod: "wac" as const })),
    update: (s: Partial<T.StoreSettings>) => call<T.StoreSettings>("/api/settings/", () => ({ storeName: "", taxRate: 0, costingMethod: "wac" as const, ...s }), body("PATCH", s)),
  },
};
