// Gregorian <-> Jalali (Solar Hijri) conversion, used for accounting dates entered/displayed by the user.
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

function jalCal(jy: number) {
  const bl = BREAKS.length; const gy = jy + 621;
  let leapJ = -14; let jp = BREAKS[0]!; let jump = 0; let jm = 0;
  if (jy < jp || jy >= BREAKS[bl - 1]!) throw new Error("سال شمسی نامعتبر است");
  for (let i = 1; i < bl; i += 1) { jm = BREAKS[i]!; jump = jm - jp; if (jy < jm) break; leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4); jp = jm; }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4); if (leap === -1) leap = 4;
  return { leap, gy, march };
}
const g2d = (gy: number, gm: number, gd: number) => {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752; return d;
};
const d2g = (jdn: number) => {
  let j = 4 * jdn + 139361631; j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308; const gd = div(mod(i, 153), 5) + 1; const gm = mod(div(i, 153), 12) + 1;
  return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm, gd };
};
const j2d = (jy: number, jm: number, jd: number) => { const r = jalCal(jy); return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1; };
export function toJalali(gy: number, gm: number, gd: number) {
  const jdn = g2d(gy, gm, gd); let jy = d2g(jdn).gy - 621; const r = jalCal(jy); let k = jdn - g2d(d2g(jdn).gy, 3, r.march);
  if (k >= 0) { if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }; k -= 186; }
  else { jy -= 1; k += 179; if (r.leap === 1) k += 1; }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}
export const toGregorian = (jy: number, jm: number, jd: number) => d2g(j2d(jy, jm, jd));

const FA = "۰۱۲۳۴۵۶۷۸۹", AR = "٠١٢٣٤٥٦٧٨٩";
const en = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
const p2 = (n: number) => String(n).padStart(2, "0");
/** ISO -> "1405/08/25" (Jalali, ASCII digits) for date inputs. */
export function isoToJalaliInput(iso: string) { const d = new Date(iso); const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return `${j.jy}/${p2(j.jm)}/${p2(j.jd)}`; }
export const isoToTimeInput = (iso: string) => { const d = new Date(iso); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
/** "1405/08/25" + "14:30" -> ISO string; returns null when invalid. Empty time = current time of day. */
export function jalaliInputToIso(date: string, time: string, fallbackIso = new Date().toISOString()): string | null {
  const m = en(date.trim()).match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/); if (!m) return null;
  const [jy, jm, jd] = [+m[1]!, +m[2]!, +m[3]!];
  if (jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : jm <= 11 ? 30 : 30)) return null;
  const g = toGregorian(jy, jm, jd); const back = toJalali(g.gy, g.gm, g.gd); if (back.jy !== jy || back.jm !== jm || back.jd !== jd) return null;
  const f = new Date(fallbackIso); let hh = f.getHours(), mm = f.getMinutes();
  if (time.trim()) { const t = en(time.trim()).match(/^(\d{1,2}):(\d{2})$/); if (!t || +t[1]! > 23 || +t[2]! > 59) return null; hh = +t[1]!; mm = +t[2]!; }
  return new Date(g.gy, g.gm - 1, g.gd, hh, mm, 0, 0).toISOString();
}
