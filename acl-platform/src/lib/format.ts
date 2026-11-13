/** Pure formatting helpers shared by server and client code. */

export const SITE_TZ = "Africa/Lagos"; // West Africa Time — league default display zone
export const SITE_TZ_LABEL = "WAT";

export function flag(code?: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const d = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: SITE_TZ, ...opts });
const F = {
  date: d({ day: "numeric", month: "long", year: "numeric" }),
  short: d({ day: "numeric", month: "short", year: "numeric" }),
  dayMonth: d({ day: "numeric", month: "short" }),
  weekday: d({ weekday: "long" }),
  time: d({ hour: "2-digit", minute: "2-digit", hour12: false }),
  month: d({ month: "long", year: "numeric" }),
  monthShort: d({ month: "short" }),
  day: d({ day: "2-digit" }),
};
type DateIn = Date | string;
const D = (v: DateIn) => (typeof v === "string" ? new Date(v) : v);
export const fmtDate = (v: DateIn) => F.date.format(D(v));
export const fmtDateShort = (v: DateIn) => F.short.format(D(v));
export const fmtDayMonth = (v: DateIn) => F.dayMonth.format(D(v));
export const fmtWeekday = (v: DateIn) => F.weekday.format(D(v));
export const fmtTime = (v: DateIn) => `${F.time.format(D(v))} ${SITE_TZ_LABEL}`;
export const fmtMonth = (v: DateIn) => F.month.format(D(v));
export const fmtMonthShort = (v: DateIn) => F.monthShort.format(D(v)).toUpperCase();
export const fmtDay = (v: DateIn) => F.day.format(D(v));
export const fmtEventDate = (v: DateIn) => `${fmtWeekday(v)} — ${fmtDate(v)}`;
export const monthKey = (v: DateIn) => {
  const p = d({ year: "numeric", month: "2-digit" }).formatToParts(D(v));
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`;
};

export function timeAgo(v: DateIn): string {
  const s = Math.round((Date.now() - D(v).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDateShort(v);
}

export function age(dob: DateIn, at: Date = new Date()): number {
  const b = D(dob);
  let a = at.getUTCFullYear() - b.getUTCFullYear();
  if (at.getUTCMonth() < b.getUTCMonth() || (at.getUTCMonth() === b.getUTCMonth() && at.getUTCDate() < b.getUTCDate())) a--;
  return a;
}

export function cmToFeet(cm: number): string {
  const totalIn = Math.round(cm / 2.54);
  return `${Math.floor(totalIn / 12)}′${totalIn % 12}″`;
}
export const height = (cm: number) => `${cm} cm · ${cmToFeet(cm)}`;
export const reach = (cm: number) => `${cm} cm · ${Math.round(cm / 2.54)}″`;

export function duration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** SUPER_WELTERWEIGHT → "Super Welterweight" */
export function label(v: string): string {
  return v
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const METHODS: Record<string, string> = {
  KO: "KO",
  TKO: "TKO",
  UD: "Unanimous decision",
  SD: "Split decision",
  MD: "Majority decision",
  DRAW: "Draw",
  RTD: "Corner retirement",
  DQ: "Disqualification",
  NC: "No contest",
};
export const methodLabel = (m?: string | null) => (m ? METHODS[m] ?? m : "");
export const isStoppage = (m?: string | null) => m === "KO" || m === "TKO" || m === "RTD";

export function compact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
export const num = (n: number) => new Intl.NumberFormat("en").format(n);
export const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export function money(minor: number, currency: string): string {
  const zeroDecimal = ["XOF", "XAF", "UGX", "RWF", "TZS"].includes(currency);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: zeroDecimal || minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(minor / 100);
}

export function slugify(v: string): string {
  return v
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Fan rank ladder. Thresholds are total fan points. */
export const FAN_RANKS = [
  { name: "ROOKIE", min: 0 },
  { name: "CONTENDER", min: 250 },
  { name: "CHALLENGER", min: 750 },
  { name: "ELITE", min: 2000 },
  { name: "CHAMPION", min: 5000 },
  { name: "LEGEND", min: 12000 },
] as const;

export function fanRank(points: number) {
  let i = 0;
  while (i + 1 < FAN_RANKS.length && points >= FAN_RANKS[i + 1].min) i++;
  const next = FAN_RANKS[i + 1];
  return {
    name: FAN_RANKS[i].name,
    index: i,
    next: next?.name ?? null,
    toNext: next ? next.min - points : 0,
    progress: next ? Math.round(((points - FAN_RANKS[i].min) / (next.min - FAN_RANKS[i].min)) * 100) : 100,
  };
}
