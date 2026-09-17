/** Nigerian Naira, whole units. ₦8,730,000 */
export function formatNaira(amount: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    if (Math.abs(amount) >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
    if (Math.abs(amount) >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  }
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-NG");
}

export function formatPercent(value: number, total: number, digits = 0): string {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(digits)}%`;
}

export function pct(value: number, total: number): number {
  return total ? (value / total) * 100 : 0;
}

const TIME_FMT = new Intl.DateTimeFormat("en-NG", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Lagos",
});

const DATE_FMT = new Intl.DateTimeFormat("en-NG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-NG", {
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Lagos",
});

export function formatTime(iso: string | Date): string {
  return TIME_FMT.format(new Date(iso)).toUpperCase();
}

export function formatDate(iso: string | Date): string {
  return DATE_FMT.format(new Date(iso));
}

export function formatDateTime(iso: string | Date): string {
  return DATETIME_FMT.format(new Date(iso)).toUpperCase();
}

export function relativeTime(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  elapsed: boolean;
}

export function countdownTo(target: string | Date, from: number = Date.now()): Countdown {
  const delta = new Date(target).getTime() - from;
  const elapsed = delta <= 0;
  const abs = Math.abs(delta);
  return {
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1000),
    elapsed,
  };
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
