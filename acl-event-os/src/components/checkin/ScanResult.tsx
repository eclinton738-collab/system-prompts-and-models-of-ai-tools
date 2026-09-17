"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, ShieldAlert, XCircle, Clock, MapPin, User, Smartphone } from "lucide-react";
import { formatNaira, formatTime, formatDateTime } from "@/lib/domain/format";
import { TICKET_TYPES } from "@/lib/domain/catalog";
import { Badge, PaymentBadge } from "@/components/ui/Badge";
import type { ValidationOutcome } from "@/lib/domain/types";

/**
 * The gate screen.
 *
 * Three distinct states: admitted, refused, and a refusal that is also a
 * security incident. A refusal always says exactly why.
 */
export function ScanResult({ outcome, compact = false }: { outcome: ValidationOutcome; compact?: boolean }) {
  const granted = outcome.result === "GRANTED";
  const duplicate = outcome.reason === "ALREADY_USED";
  const isSecurity = Boolean(outcome.securityEvent) && outcome.securityEvent?.severity !== "MEDIUM";

  return (
    <div
      className={cn(
        "acl-flash-in relative overflow-hidden rounded-[4px] border",
        granted ? "border-ok/50 bg-ok/[0.07]" : "border-danger/55 bg-danger/[0.07]",
      )}
      role="status"
      aria-live="assertive"
    >
      <div className={cn("absolute inset-x-0 top-0 h-[3px]", granted ? "bg-ok" : "bg-danger")} />

      <div className="flex items-start gap-3 px-4 pb-3 pt-4">
        {granted ? (
          <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-ok" />
        ) : duplicate ? (
          <ShieldAlert className="mt-0.5 h-8 w-8 shrink-0 text-danger" />
        ) : (
          <XCircle className="mt-0.5 h-8 w-8 shrink-0 text-danger" />
        )}
        <div className="min-w-0 flex-1">
          {!granted && isSecurity ? (
            <p className="acl-label mb-1 !text-[9.5px] text-danger">Security alert</p>
          ) : null}
          <h3
            className={cn(
              "font-display font-black uppercase leading-none tracking-[-0.01em]",
              compact ? "text-[20px]" : "text-[27px]",
              granted ? "text-ok" : "text-danger",
            )}
          >
            {granted ? "VALID TICKET" : outcome.headline}
          </h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{outcome.message}</p>
        </div>
      </div>

      {outcome.ticket ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-hairline/70 px-4 py-3 sm:grid-cols-3">
          <Detail label="Ticket ID" value={outcome.ticket.id} mono />
          <Detail label="Customer" value={outcome.ticket.attendeeName} />
          <Detail
            label="Ticket type"
            value={`${TICKET_TYPES[outcome.ticket.type].name} — ${formatNaira(outcome.ticket.price)}`}
          />
          <div>
            <dt className="acl-label mb-1 !text-[8.5px]">Payment</dt>
            <dd>
              <PaymentBadge status={outcome.ticket.paymentStatus} />
            </dd>
          </div>
          {outcome.checkIn ? (
            <>
              <Detail label="Scan time" value={formatTime(outcome.checkIn.scannedAt)} mono />
              <Detail label="Gate" value={outcome.checkIn.gateName} />
            </>
          ) : null}
        </dl>
      ) : (
        <div className="border-t border-hairline/70 px-4 py-3">
          <Detail label="Scanned reference" value={outcome.checkIn?.ticketId ?? "—"} mono />
        </div>
      )}

      {duplicate && outcome.duplicate ? (
        <div className="border-t border-danger/35 bg-danger/[0.09] px-4 py-3">
          <p className="acl-label mb-2 !text-[9px] text-danger">Duplicate scan attempt — first entry on record</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <IncidentRow icon={<Clock className="h-3.5 w-3.5" />} label="First scanned" value={formatDateTime(outcome.duplicate.firstScanAt)} />
            <IncidentRow icon={<MapPin className="h-3.5 w-3.5" />} label="Gate" value={outcome.duplicate.firstScanGate} />
            <IncidentRow icon={<User className="h-3.5 w-3.5" />} label="Operator" value={outcome.duplicate.firstScanOperator} />
          </div>
          <p className="mt-2.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-danger">
            Status: rejected · this ticket cannot be used again
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5",
          granted ? "border-ok/35 bg-ok/[0.09]" : "border-danger/35 bg-danger/[0.09]",
        )}
      >
        <p
          className={cn(
            "font-display font-black uppercase tracking-[0.12em]",
            compact ? "text-[13px]" : "text-[15px]",
            granted ? "text-ok" : "text-danger",
          )}
        >
          {granted ? "Access granted" : "Access denied"}
        </p>
        <div className="flex items-center gap-2">
          {outcome.checkIn ? (
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-4">
              <Smartphone className="h-3 w-3" />
              {outcome.checkIn.deviceId}
            </span>
          ) : null}
          <Badge tone={granted ? "ok" : "danger"}>{outcome.durationMs}ms</Badge>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="acl-label mb-0.5 !text-[8.5px]">{label}</dt>
      <dd className={cn("truncate text-[12.5px] text-ink", mono && "font-mono text-[12px]")}>{value}</dd>
    </div>
  );
}

function IncidentRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-danger">{icon}</span>
      <div className="min-w-0">
        <p className="acl-label !text-[8px]">{label}</p>
        <p className="truncate text-[12px] font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
