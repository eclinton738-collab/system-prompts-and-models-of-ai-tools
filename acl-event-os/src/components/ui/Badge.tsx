import { cn } from "@/lib/utils";
import type { PaymentStatus, TicketStatus, SecuritySeverity, CheckInResult } from "@/lib/domain/types";

const TONES = {
  ok: "bg-ok/12 text-ok border-ok/30",
  warn: "bg-warn/12 text-warn border-warn/30",
  danger: "bg-danger/12 text-danger border-danger/35",
  info: "bg-info/12 text-info border-info/30",
  gold: "bg-gold/12 text-gold border-gold/30",
  neutral: "bg-surface-3 text-ink-2 border-hairline-strong",
  red: "bg-acl-red/12 text-acl-red-bright border-acl-red/35",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] border px-2 py-[3px] font-display text-[10px] font-bold uppercase tracking-[0.1em]",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  PAID: "ok",
  PENDING: "warn",
  FAILED: "danger",
  REFUNDED: "neutral",
};

export function PaymentBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <Badge tone={PAYMENT_TONE[status]} dot className={className}>
      {status}
    </Badge>
  );
}

const TICKET_TONE: Record<TicketStatus, Tone> = {
  VALID: "info",
  USED: "ok",
  REFUNDED: "neutral",
  SUSPENDED: "danger",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={TICKET_TONE[status]}>{status}</Badge>;
}

const SEVERITY_TONE: Record<SecuritySeverity, Tone> = {
  CRITICAL: "danger",
  HIGH: "red",
  MEDIUM: "warn",
  INFO: "info",
};

export function SeverityBadge({ severity }: { severity: SecuritySeverity }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{severity}</Badge>;
}

export function ResultBadge({ result }: { result: CheckInResult }) {
  return (
    <Badge tone={result === "GRANTED" ? "ok" : "danger"} dot>
      {result}
    </Badge>
  );
}
