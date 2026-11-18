// @ts-nocheck -- dev-only seed data; strict index checks skipped intentionally
// DEVELOPMENT MOCK LAYER — in-memory only, resets on reload. Used when VITE_API_BASE_URL is empty.
import type * as T from "./types";

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString();
let seq = 1000;
export const uid = () => String(++seq);
let barSeq = 0;
/** Mirrors the backend: unique auto-generated product code and EAN-style barcode. */
export const genBarcode = () => "626" + String(++barSeq).padStart(10, "0");
export const genProductSku = () => `P${String(++seq).padStart(5, "0")}`;
export const genInvoiceCode = () => `F${String(++seq).padStart(6, "0")}`;
export const WALKIN_ID = "walkin";
let txSeq = 0, invSeq = 3021, retSeq = 42, puSeq = 21, movSeq = 0;
/** Unique, permanent transaction reference. */
export const genTxRef = () => `TX${String(++txSeq).padStart(7, "0")}`;
export const genSaleNumber = (type: "sale" | "return") => (type === "sale" ? `INV-${++invSeq}` : `RET-${String(++retSeq).padStart(4, "0")}`);
export const genPurchaseNumber = () => `PU-1405-${String(++puSeq).padStart(3, "0")}`;
export const genMovementRef = (p: string) => `${p}-${String(++movSeq).padStart(3, "0")}`;

export const db = {
  categories: [
    { id: "c1", name: "دستگاه پن و روتاری", parentId: null },
    { id: "c2", name: "کارتریج و سوزن", parentId: null },
    { id: "c3", name: "جوهر و رنگ", parentId: null },
    { id: "c4", name: "یکبار مصرف و بهداشتی", parentId: null },
    { id: "c5", name: "سایر محصولات", parentId: null },
    { id: "c21", name: "کارتریج لاینر", parentId: "c2" },
  ] as T.Category[],
  rates: [
    { code: "IRT", name: "تومان", rate: 1, previousRate: 1, updatedAt: d(0), history: [] },
    { code: "USD", name: "دلار آمریکا", rate: 92000, previousRate: 89500, updatedAt: d(0), history: [{ date: d(14), rate: 87000 }, { date: d(7), rate: 89500 }, { date: d(0), rate: 92000 }] },
    { code: "AED", name: "درهم امارات", rate: 25050, previousRate: 25300, updatedAt: d(1), history: [{ date: d(7), rate: 25300 }, { date: d(1), rate: 25050 }] },
    { code: "CNY", name: "یوان چین", rate: 12700, previousRate: 12450, updatedAt: d(2), history: [{ date: d(9), rate: 12450 }, { date: d(2), rate: 12700 }] },
  ] as T.CurrencyRate[],
  products: [] as T.Product[],
  suppliers: [
    { id: "s1", name: "بازرگانی آرین تتو", phone: "۰۲۱۸۸۷۷۶۶۵۵", city: "تهران", balance: -48000000 },
    { id: "s2", name: "Dubai Ink Trading", phone: "+971501234567", city: "دبی", balance: -12500000 },
    { id: "s3", name: "Yiwu Supply Co.", phone: "+8657912345", city: "ییوو", balance: 0 },
  ] as T.Party[],
  customers: [
    { id: "walkin", name: "مشتری گذری", phone: "", city: "", balance: 0, code: "920" },
    { id: "k1", name: "استودیو سایه", phone: "۰۹۱۲۱۱۱۲۲۳۳", city: "تهران", balance: 6500000 },
    { id: "k2", name: "علی رضایی", phone: "۰۹۳۵۴۴۴۵۵۶۶", city: "شیراز", balance: 0 },
    { id: "k3", name: "استودیو اینک‌هاوس", phone: "۰۹۱۳۷۷۷۸۸۹۹", city: "اصفهان", balance: 14200000 },
  ] as T.Party[],
  purchases: [] as T.PurchaseInvoice[],
  sales: [] as T.SalesInvoice[],
  movements: [] as T.StockMovement[],
  expenses: [
    { id: "e1", date: d(3), title: "اجاره فروشگاه", category: "اجاره", amount: 45000000, account: "بانک ملت" },
    { id: "e2", date: d(5), title: "هزینه پیک", category: "حمل", amount: 1800000, account: "صندوق" },
    { id: "e3", date: d(10), title: "تبلیغات اینستاگرام", category: "بازاریابی", amount: 12000000, account: "بانک ملت" },
  ] as T.Expense[],
  accounts: [
    { id: "a1", name: "صندوق فروشگاه", type: "cash", balance: 38500000, code: "100" },
    { id: "a2", name: "بانک ملت", type: "bank", balance: 612000000, code: "101" },
    { id: "a3", name: "بانک سامان", type: "bank", balance: 154000000, code: "102" },
  ] as T.Account[],
  accountTx: [] as T.AccountTx[],
  users: [
    { id: "u1", name: "مدیر سیستم", username: "admin", role: "مدیر", permissions: ["*"], active: true },
    { id: "u2", name: "سارا محمدی", username: "sara", role: "فروشنده", permissions: ["sales", "customers", "price-list:view"], active: true },
    { id: "u3", name: "رضا کریمی", username: "reza", role: "انباردار", permissions: ["inventory", "purchases"], active: false },
  ] as T.AppUser[],
};

function v(productId: string, sku: string, attributes: Record<string, string>, buy: number, sell: number, currency: T.CurrencyCode, rate: number, stock: number, ago: number): T.Variant {
  return { id: uid(), productId, sku, barcode: genBarcode(), attributes, purchasePrice: buy, sellingPrice: sell, currency, baseRate: rate, stock, minStock: 10, locked: false, manualOverride: null, updatedAt: d(ago), priceHistory: [{ date: d(ago + 20), price: sell * 0.92 }, { date: d(ago), price: sell }] };
}
function p(id: string, name: string, sku: string, brand: string, categoryId: string, mode: T.Product["inventoryMode"], units: T.PackUnit[], attrs: Record<string, string>, variants: (pid: string) => T.Variant[]): T.Product {
  return { id, name, sku, brand, categoryId, description: "", images: [], attributes: attrs, inventoryMode: mode, units, variants: variants(id) };
}
const cartUnits = [{ name: "عدد", factor: 1 }, { name: "بسته", factor: 20 }, { name: "کارتن", factor: 200 }];
db.products = [
  p("p1", "کارتریج Kwadron", "KWD", "Kwadron", "c2", "shared", cartUnits, { "جنس": "استیل جراحی" }, (id) =>
    ["3RL", "5RL", "7RL", "9RS", "11M1", "15RM"].map((n, i) => v(id, `KWD-${n}`, { "نوع سوزن": n.replace(/\d+/, ""), "تعداد سوزن": n.match(/\d+/)![0], "قطر": "0.35mm", "تعداد در بسته": "20" }, 9.5, 14, "USD", 89500, [120, 8, 64, 40, 5, 90][i], i))),
  p("p2", "کارتریج Cheyenne Safety", "CHY", "Cheyenne", "c2", "shared", cartUnits, {}, (id) =>
    ["3RL", "7RS", "13M1"].map((n, i) => v(id, `CHY-${n}`, { "نوع سوزن": n.replace(/\d+/, ""), "تعداد سوزن": n.match(/\d+/)![0], "قطر": "0.30mm", "تعداد در بسته": "20" }, 22, 32, "USD", 89500, [30, 12, 3][i], i + 2))),
  p("p3", "جوهر Eternal Ink", "ETR", "Eternal", "c3", "independent", [{ name: "بطری", factor: 1 }], {}, (id) =>
    [["مشکی", "30ml"], ["مشکی", "60ml"], ["قرمز", "30ml"], ["سفید", "60ml"]].map(([c, vol], i) => v(id, `ETR-${i}`, { "رنگ": c, "حجم": vol, "سری": "Classic" }, 9, 13, "AED", 25300, [25, 18, 6, 40][i], i + 1))),
  p("p4", "جوهر Dynamic", "DYN", "Dynamic", "c3", "independent", [{ name: "بطری", factor: 1 }], {}, (id) =>
    [["Triple Black", "240ml"], ["Lining Black", "30ml"]].map(([c, vol], i) => v(id, `DYN-${i}`, { "رنگ": c, "حجم": vol }, 85, 120, "CNY", 12450, [9, 22][i], 4))),
  p("p5", "دستگاه FK Irons Spektra Flux", "FKF", "FK Irons", "c1", "independent", [{ name: "دستگاه", factor: 1 }], {}, (id) =>
    [["مشکی", "3.5mm"], ["نقره‌ای", "4.0mm"]].map(([c, s], i) => v(id, `FKF-${i}`, { "رنگ": c, "استروک": s }, 520, 690, "USD", 89500, [3, 2][i], 6))),
  p("p6", "دستکش نیتریل", "GLV", "Medicom", "c4", "shared", [{ name: "عدد", factor: 1 }, { name: "جعبه", factor: 100 }], {}, (id) =>
    ["S", "M", "L"].map((s, i) => v(id, `GLV-${s}`, { "سایز": s, "رنگ": "مشکی" }, 1900, 2800, "IRT", 1, [1200, 2600, 400][i], 3))),
  p("p7", "کاور دستگاه", "CVR", "Saferly", "c4", "shared", [{ name: "عدد", factor: 1 }, { name: "بسته", factor: 200 }], {}, (id) => [v(id, "CVR-1", { "ابعاد": "استاندارد" }, 750, 1100, "IRT", 1, 3000, 9)]),
  p("p8", "منبع تغذیه Critical", "CRT", "Critical", "c5", "independent", [{ name: "عدد", factor: 1 }], {}, (id) => [v(id, "CRT-ATOM", { "مدل": "Atom X" }, 140, 199, "USD", 89500, 4, 12)]),
];

db.accounts.forEach((a, i) => { a.createdAt = d(30 - i); });
db.accountTx = db.accounts.flatMap((a, i) => [
  { id: `t${a.id}a`, accountId: a.id, date: d(6 - i), type: "deposit" as const, amount: Math.round(a.balance * 0.6) * 10, description: "افتتاح حساب", code: a.code!, balanceAfter: Math.round(a.balance * 0.6) },
  { id: `t${a.id}b`, accountId: a.id, date: d(2), type: "deposit" as const, amount: (a.balance - Math.round(a.balance * 0.6)) * 10, description: "واریز", code: a.code!, balanceAfter: a.balance },
]);
db.accountTx.forEach((t, i) => { t.createdAt = t.date; t.seq = i + 1; t.ref = genTxRef(); });
const allV = () => db.products.flatMap((x) => x.variants);
const vs = allV();
db.purchases = [
  { id: "pu1", number: "PU-1405-021", supplierId: "s2", date: d(4), currency: "AED", rate: 25300, items: [{ variantId: vs[9].id, qty: 40, unitPrice: 9 }], shipping: 4500000, customs: 2800000, commission: 900000, discount: 0, other: 0, total: 17308000, status: "received" },
  { id: "pu2", number: "PU-1405-020", supplierId: "s1", date: d(9), currency: "USD", rate: 89500, items: [{ variantId: vs[0].id, qty: 200, unitPrice: 9.5 }, { variantId: vs[2].id, qty: 100, unitPrice: 9.5 }], shipping: 6000000, customs: 9500000, commission: 2000000, discount: 1500000, other: 0, total: 271025000, status: "received" },
];
db.sales = ([
  { id: "sa1", number: "INV-3021", customerId: "k1", date: d(0), items: [{ variantId: vs[0].id, unit: "بسته", qty: 2, unitPrice: 25300000 }], total: 50600000, paymentStatus: "paid", type: "sale" },
  { id: "sa2", number: "INV-3020", customerId: "k3", date: d(1), items: [{ variantId: vs[9].id, unit: "بطری", qty: 6, unitPrice: 329000 }], total: 1974000, paymentStatus: "partial", type: "sale" },
  { id: "sa3", number: "INV-3019", customerId: "k2", date: d(2), items: [{ variantId: vs[20].id, unit: "جعبه", qty: 3, unitPrice: 280000 }], total: 840000, paymentStatus: "unpaid", type: "sale" },
  { id: "sa4", number: "RET-0042", customerId: "k1", date: d(3), items: [{ variantId: vs[3].id, unit: "عدد", qty: 5, unitPrice: 1253000 }], total: -6265000, paymentStatus: "refunded", type: "return" },
] as any[]).map((x) => {
  const abs = Math.abs(x.total); const paid = x.paymentStatus === "paid" || x.paymentStatus === "refunded" ? abs : x.paymentStatus === "partial" ? 600000 : 0;
  return { ...x, code: genInvoiceCode(), paidAmount: paid, outstanding: abs - paid };
}) as T.SalesInvoice[];
db.movements = [
  { id: "m1", date: d(0), variantId: vs[0].id, type: "out", qty: 40, unit: "عدد", ref: "INV-3021" },
  { id: "m2", date: d(4), variantId: vs[9].id, type: "in", qty: 40, unit: "بطری", ref: "PU-1405-021" },
  { id: "m3", date: d(5), variantId: vs[20].id, type: "convert", qty: 2, unit: "جعبه → عدد", ref: "CNV-12" },
  { id: "m4", date: d(3), variantId: vs[3].id, type: "return", qty: 5, unit: "عدد", ref: "RET-0042" },
  { id: "m5", date: d(6), variantId: vs[13].id, type: "transfer", qty: 1, unit: "دستگاه", ref: "TRF-07" },
];

export const dashboard: T.DashboardSummary = {
  totalSales: 1842000000, totalPurchases: 1210000000, estimatedProfit: 486000000, inventoryValue: 3120000000,
  salesByMonth: [["فروردین", 980], ["اردیبهشت", 1120], ["خرداد", 1340], ["تیر", 1210], ["مرداد", 1580], ["شهریور", 1842]].map(([m, v]) => ({ month: m as string, value: (v as number) * 1e6 })),
  topProducts: [{ name: "Kwadron 3RL", qty: 1840 }, { name: "دستکش نیتریل M", qty: 1500 }, { name: "Eternal مشکی 30ml", qty: 320 }, { name: "Cheyenne 7RS", qty: 260 }, { name: "Dynamic Triple Black", qty: 140 }],
};
export const accounting: T.AccountingSummary = {
  income: 1842000000, expenses: 158800000, receivables: 20700000, payables: 60500000,
  pnl: [{ label: "درآمد فروش", value: 1842000000 }, { label: "بهای تمام‌شده کالا", value: -1197200000 }, { label: "سود ناخالص", value: 644800000 }, { label: "هزینه‌های عملیاتی", value: -158800000 }, { label: "سود خالص", value: 486000000 }],
  inventoryValuation: [{ category: "کارتریج و سوزن", value: 1450000000 }, { category: "جوهر و رنگ", value: 620000000 }, { category: "دستگاه پن و روتاری", value: 780000000 }, { category: "یکبار مصرف", value: 190000000 }, { category: "سایر", value: 80000000 }],
};
