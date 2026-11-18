const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 });
export const num = (n: number) => nf.format(Math.round(n * 100) / 100);
export const toman = (n: number) => `${nf.format(Math.round(n))} ت`;
export const pct = (n: number) => `${n > 0 ? "+" : ""}${nf.format(Math.round(n * 10) / 10)}٪`;
const df = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" });
export const jdate = (iso: string) => df.format(new Date(iso));
export const today = () => new Date().toISOString();
export const page = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} | تتو ERP` }, { name: "description", content: description },
    { property: "og:title", content: `${title} | تتو ERP` }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ],
});

const FA = "۰۱۲۳۴۵۶۷۸۹", AR = "٠١٢٣٤٥٦٧٨٩";
/** Normalises Persian/Arabic digits and separators to plain ASCII ("۱۲٬۳۴۵" → "12,345"). */
export const toEnDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[٬،]/g, ",").replace(/٫/g, ".");
/** Groups the integer part of a raw numeric string in threes: "1234567.5" → "1,234,567.5". */
export const groupDigits = (raw: string) => {
  const m = raw.match(/^(-?)(\d*)(\.\d*)?$/);
  return m ? (m[1] ?? "") + (m[2] ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (m[3] ?? "") : raw;
};
/** Parses user input with separators into a number (0 when empty/invalid). */
export const parseNum = (s: string) => { const n = Number(toEnDigits(s).replace(/,/g, "")); return Number.isFinite(n) ? n : 0; };
export const nowTime = (iso: string) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const rial = (n: number) => `${nf.format(Math.round(n))} ریال`;

/** Search normalisation: ASCII digits, Persian letter variants, lower case, collapsed spaces. */
export const norm = (s: unknown) => toEnDigits(String(s ?? "")).toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\u200f\u200e]/g, " ").replace(/\s+/g, " ").trim();
/** True when every word of `q` appears in `hay` (Persian/English, digit-insensitive). */
export const matches = (hay: string, q: string) => { const h = norm(hay); return norm(q).split(" ").filter(Boolean).every((t) => h.includes(t)); };
export const jtime = (iso: string) => new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
