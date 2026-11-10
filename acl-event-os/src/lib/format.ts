import type { PaymentMethod, ScanReason } from "./types";

export const TZ = "Africa/Lagos";

export function naira(n: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && Math.abs(n) >= 1_000_000) {
    return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "")}M`;
  }
  if (opts.compact && Math.abs(n) >= 1_000) return `₦${Math.round(n / 1_000)}K`;
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...o });
const timeF = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const timeSecF = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
const dateF = fmt({ day: "2-digit", month: "short", year: "numeric" });
const dayF = fmt({ day: "2-digit", month: "short" });
const isoDayF = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export const time = (iso: string) => timeF.format(new Date(iso));
export const timeSec = (iso: string) => timeSecF.format(new Date(iso));
export const date = (iso: string) => dateF.format(new Date(iso));
export const shortDay = (iso: string) => dayF.format(new Date(iso));
export const dateTime = (iso: string) => `${dayF.format(new Date(iso))}, ${timeF.format(new Date(iso))}`;
/** YYYY-MM-DD in venue time, for bucketing. */
export const dayKey = (iso: string | number) => isoDayF.format(new Date(iso));

export function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function signedPct(n: number | null) {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${Math.round(n)}%`;
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  USSD: "USSD",
  CASH_OUTLET: "Cash / Outlets",
  POS_AGENT: "POS / Agents",
};

/** Operator-facing explanation for every scan outcome. Never just "invalid". */
export const REASON_LABEL: Record<ScanReason, string> = {
  OK: "Valid check-in",
  NOT_FOUND: "Ticket does not exist",
  MALFORMED: "Unreadable code",
  TAMPERED_QR: "Tampered QR code",
  UNSIGNED_QR: "Unsigned QR code",
  WRONG_EVENT: "Wrong event",
  EVENT_ENDED: "Ticket expired",
  PAYMENT_PENDING: "Payment pending",
  PAYMENT_FAILED: "Payment failed",
  REFUNDED: "Ticket refunded",
  CANCELLED: "Ticket cancelled",
  SUSPENDED: "Suspended ticket",
  DUPLICATE: "Duplicate QR attempt",
  WRONG_GATE: "Wrong gate",
};

export function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}
