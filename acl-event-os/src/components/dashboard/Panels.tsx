"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge, PaymentBadge, ResultBadge, SeverityBadge } from "@/components/ui/Badge";
import { DataTable, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { TierLegendDot } from "@/components/charts/Charts";
import { formatNaira, formatTime, formatNumber, relativeTime } from "@/lib/domain/format";
import { TICKET_TYPES } from "@/lib/domain/catalog";
import { useAcl } from "@/lib/client/provider";
import {
  Activity, ArrowRight, Clock, Gauge, MapPin, ScanLine, ShieldAlert, Users, Zap, Wifi,
} from "lucide-react";
import type { CheckIn, SecurityEvent } from "@/lib/domain/types";
import type { RecentSale } from "@/lib/client/types";
import type { CheckInStats, Slice } from "@/lib/domain/stats";

/** Live system health, derived from gate state and scanner activity. */
export function SystemStatus() {
  const { state } = useAcl();
  const open = state?.gatesOpen?.open ?? false;
  const scans = state?.checkIn?.lastHour ?? 0;
  const speed = state?.checkIn?.averageScanMs ?? 0;

  return (
    <Panel className="flex flex-col justify-between p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", open ? "bg-ok acl-live-dot" : "bg-warn")} />
            <span className={cn("font-display text-[17px] font-black uppercase tracking-[0.04em]", open ? "text-ok" : "text-warn")}>
              {open ? "Online" : "Standby"}
            </span>
          </div>
          <p className="acl-label mt-1.5 !text-[9.5px]">System status</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-ok/30 bg-ok/12 text-ok">
          <Wifi className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-4">
        {open ? "All systems operational." : state?.gatesOpen?.detail}
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-hairline pt-2.5">
        <div>
          <p className="font-mono text-[13px] font-semibold text-ink">{scans}</p>
          <p className="acl-label !text-[8px]">Scans / hr</p>
        </div>
        <div>
          <p className="font-mono text-[13px] font-semibold text-ink">{(speed / 1000).toFixed(1)}s</p>
          <p className="acl-label !text-[8px]">Avg scan</p>
        </div>
      </div>
    </Panel>
  );
}

export function RevenueTracker({
  revenue,
  projected,
  progress,
  paid,
  pending,
  refunded,
  pendingValue,
  refundedValue,
  children,
}: {
  revenue: number;
  projected: number;
  progress: number;
  paid: number;
  pending: number;
  refunded: number;
  pendingValue: number;
  refundedValue: number;
  children?: React.ReactNode;
}) {
  return (
    <Panel>
      <PanelHeader title="Revenue Overview" subtitle="Settled ticket revenue against target" />
      <div className="p-4">
        <p className="acl-stat text-[30px] leading-none text-ink sm:text-[34px]">{formatNaira(revenue)}</p>
        <p className="mt-1.5 text-[11.5px] text-ink-3">of projected {formatNaira(projected)}</p>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1B1F26]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ok to-[#3FE08C] transition-all duration-700"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <span className="font-mono text-[12px] font-semibold text-ok">{Math.round(progress)}%</span>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
          <div>
            <dt className="acl-label !text-[8.5px]">Paid</dt>
            <dd className="mt-1 font-mono text-[14px] font-semibold text-ok">{formatNumber(paid)}</dd>
          </div>
          <div>
            <dt className="acl-label !text-[8.5px]">Pending</dt>
            <dd className="mt-1 font-mono text-[14px] font-semibold text-warn">{formatNumber(pending)}</dd>
            <dd className="text-[10px] text-ink-4">{formatNaira(pendingValue, { compact: true })}</dd>
          </div>
          <div>
            <dt className="acl-label !text-[8.5px]">Refunded</dt>
            <dd className="mt-1 font-mono text-[14px] font-semibold text-ink-3">{formatNumber(refunded)}</dd>
            <dd className="text-[10px] text-ink-4">{formatNaira(refundedValue, { compact: true })}</dd>
          </div>
        </dl>
        {children}
      </div>
    </Panel>
  );
}

export function SalesChannels({ channels }: { channels: Slice[] }) {
  return (
    <Panel>
      <PanelHeader title="Sales Channels" subtitle="Where tickets are being bought" />
      <ul className="p-3">
        {channels.map((channel) => (
          <li key={channel.key} className="flex items-center gap-2.5 py-1.5">
            <span className="h-2 w-2 shrink-0 rounded-[1px]" style={{ background: channel.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{channel.label}</span>
            <div className="hidden h-1 w-16 overflow-hidden rounded-full bg-[#1B1F26] sm:block">
              <div className="h-full rounded-full" style={{ width: `${channel.share}%`, background: channel.color }} />
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-[11.5px] font-semibold text-ink">
              {channel.share.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function RecentScanPanel({ scan }: { scan: CheckIn | null }) {
  if (!scan) {
    return (
      <Panel>
        <PanelHeader title="Recent Scan" />
        <EmptyState title="No scans yet" body="The most recent gate scan will appear here." icon={<ScanLine className="h-5 w-5" />} />
      </Panel>
    );
  }
  const granted = scan.result === "GRANTED";
  const type = scan.ticketType !== "UNKNOWN" ? TICKET_TYPES[scan.ticketType] : null;

  return (
    <Panel>
      <PanelHeader
        title="Recent Scan"
        action={
          <Link href="/check-in/log" className="flex items-center gap-1 font-display text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-3 transition-colors hover:text-acl-red-bright">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className={cn("border-l-2 p-3.5", granted ? "border-l-ok" : "border-l-danger")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[13px] font-semibold text-ink">{scan.ticketId}</p>
            <p className="mt-0.5 truncate text-[13px] text-ink-2">{scan.attendeeName}</p>
            {type ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <TierLegendDot type={scan.ticketType as never} />
                {type.name} — {formatNaira(type.price)}
              </p>
            ) : null}
          </div>
          <ResultBadge result={scan.result} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-hairline pt-2.5 text-[11px] text-ink-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatTime(scan.scannedAt)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {scan.gateName}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {scan.operatorName}
          </span>
        </div>
        <p className={cn("mt-2.5 font-display text-[12px] font-black uppercase tracking-[0.12em]", granted ? "text-ok" : "text-danger")}>
          {granted ? "Access granted" : "Access denied"}
        </p>
      </div>
    </Panel>
  );
}

export function CheckInAnalytics({ stats, checkedIn }: { stats: CheckInStats; checkedIn: number }) {
  const cells = [
    { label: "Total Checked In", value: formatNumber(checkedIn), icon: Users, tone: "text-ok" },
    { label: "Last 1 Hour", value: formatNumber(stats.lastHour), icon: Clock, tone: "text-info" },
    { label: "Avg Scan Speed", value: `${(stats.averageScanMs / 1000).toFixed(1)}s`, icon: Zap, tone: "text-gold" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 border-t border-hairline p-3">
      {cells.map((cell) => {
        const Icon = cell.icon;
        return (
          <div key={cell.label} className="acl-inset px-2.5 py-2">
            <Icon className={cn("h-3.5 w-3.5", cell.tone)} />
            <p className="mt-1.5 font-display text-[16px] font-extrabold leading-none text-ink">{cell.value}</p>
            <p className="acl-label mt-1 !text-[7.5px] leading-tight">{cell.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export function SecurityFeed({ events, limit = 6 }: { events: SecurityEvent[]; limit?: number }) {
  return (
    <Panel>
      <PanelHeader
        title="Security Events"
        icon={<ShieldAlert className="h-3.5 w-3.5" />}
        action={
          <Link href="/security" className="flex items-center gap-1 font-display text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-3 transition-colors hover:text-acl-red-bright">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      {events.length === 0 ? (
        <EmptyState title="Gate is clean" body="No refused scans or security incidents recorded." icon={<ShieldAlert className="h-5 w-5" />} />
      ) : (
        <ul>
          {events.slice(0, limit).map((event) => (
            <li
              key={event.id}
              className={cn(
                "flex items-start gap-3 border-b border-hairline/70 px-3.5 py-2.5 last:border-0",
                event.severity === "CRITICAL" && "border-l-2 border-l-acl-red bg-acl-red/[0.05]",
              )}
            >
              <span className="mt-0.5 shrink-0 font-mono text-[10.5px] text-ink-4">{formatTime(event.at)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-ink">
                  {event.kind.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </p>
                <p className="truncate font-mono text-[11px] text-ink-3">{event.ticketId}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={event.result === "GRANTED" ? "ok" : "danger"}>{event.result}</Badge>
                <SeverityBadge severity={event.severity} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function RecentSalesTable({ sales, limit = 6 }: { sales: RecentSale[]; limit?: number }) {
  return (
    <Panel>
      <PanelHeader
        title="Recent Ticket Sales"
        icon={<Activity className="h-3.5 w-3.5" />}
        action={
          <Link href="/sales" className="flex items-center gap-1 font-display text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-3 transition-colors hover:text-acl-red-bright">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <DataTable>
        <thead>
          <tr>
            <Th className="w-8">#</Th>
            <Th>Ticket ID</Th>
            <Th>Name</Th>
            <Th>Type</Th>
            <Th align="right">Amount</Th>
            <Th>Method</Th>
            <Th>Status</Th>
            <Th align="right">Time</Th>
          </tr>
        </thead>
        <tbody>
          {sales.slice(0, limit).map((sale, i) => (
            <Tr key={sale.id}>
              <Td className="text-ink-4">{i + 1}</Td>
              <Td mono>{sale.id}</Td>
              <Td className="text-ink">{sale.name}</Td>
              <Td>
                <span className="flex items-center gap-1.5">
                  <TierLegendDot type={sale.type} />
                  {TICKET_TYPES[sale.type].name}
                </span>
              </Td>
              <Td align="right" mono>
                {formatNaira(sale.amount)}
              </Td>
              <Td>{sale.method.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Td>
              <Td>
                <PaymentBadge status={sale.status} />
              </Td>
              <Td align="right" className="whitespace-nowrap text-ink-3">
                {formatTime(sale.at)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
    </Panel>
  );
}

export function GateBoard({ stats }: { stats: CheckInStats }) {
  return (
    <Panel>
      <PanelHeader title="Gate Throughput" icon={<Gauge className="h-3.5 w-3.5" />} subtitle="Admitted vs refused by gate" />
      <ul className="p-3">
        {stats.perGate.map((gate) => {
          const total = gate.granted + gate.rejected;
          return (
            <li key={gate.gate} className="flex items-center gap-2.5 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{gate.gate}</span>
              <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-[#1B1F26]">
                <div className="h-full bg-ok" style={{ width: `${total ? (gate.granted / total) * 100 : 0}%` }} />
                <div className="h-full bg-danger" style={{ width: `${total ? (gate.rejected / total) * 100 : 0}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-[11.5px] text-ok">{gate.granted}</span>
              <span className="w-8 shrink-0 text-right font-mono text-[11.5px] text-danger">{gate.rejected}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
