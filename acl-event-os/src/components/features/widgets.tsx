"use client";

import { ArrowDownRight, ArrowUpRight, CheckCircle2, Download, ShieldAlert, ShieldCheck, Ticket as TicketIcon, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { downloadCsv } from "@/lib/csv";
import { dateTime, METHOD_LABEL, naira, pct, REASON_LABEL, signedPct, time } from "@/lib/format";
import { byMethod, byStatus, byType, channelOf, checkInStats, kpis, revenue, salesTrend, ticketRows, type TrendMode } from "@/lib/metrics";
import { CHART, METHOD_COLOR, TYPE_COLOR } from "@/lib/theme";
import type { CheckIn } from "@/lib/types";
import { AreaTrend, BarsChart, compactNaira, Donut, Legend, LinesChart } from "../charts";
import { useOps } from "../ops-provider";
import { Badge, Button, EmptyState, Pager, Panel, PaymentBadge, Progress, ScanBadge, TableWrap, Tabs, usePaged } from "../ui";
import { useUi } from "../ui-context";

/* ───────────────────────── KPI cards ───────────────────────── */
function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-fg-dim">No prior week to compare</span>;
  const up = value >= 0;
  return <span className={cn("inline-flex items-center gap-1 text-xs font-medium", up ? "text-ok" : "text-danger")}>{up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{signedPct(value)} <span className="font-normal text-fg-dim">vs last week</span></span>;
}

function Kpi({ label, value, suffix, share, tone, foot }: { label: string; value: string; suffix?: string; share?: number; tone: "acl" | "ok" | "gold" | "info"; foot: React.ReactNode }) {
  return (
    <div className="panel flex flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {share !== undefined && <span className="font-display text-xl font-bold tabular-nums leading-none text-fg-muted">{Math.round(share * 100)}%</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[22px] font-semibold leading-none tracking-tight tabular-nums sm:text-[32px]">{value}</span>
        {suffix && <span className="text-base tabular-nums text-fg-dim">{suffix}</span>}
      </div>
      {share !== undefined && <Progress value={share} tone={tone} label={label} className="mt-3" />}
      <div className="mt-2.5 min-h-[18px]">{foot}</div>
    </div>
  );
}

export function KpiCards() {
  const { s, ix, online } = useOps();
  const k = useMemo(() => kpis(s, ix), [s, ix]);
  const scanners = new Set(s.checkIns.filter((c) => Date.parse(c.at) > Date.parse(s.now) - 30 * 60_000).map((c) => c.deviceId)).size;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
      <Kpi label="Tickets Sold" value={k.sold.toLocaleString()} suffix={`/ ${k.capacity.toLocaleString()}`} share={k.soldShare} tone="acl" foot={<Delta value={k.ticketGrowth} />} />
      <Kpi label="Total Revenue" value={naira(k.revenue)} tone="ok" foot={<Delta value={k.revenueGrowth} />} />
      <Kpi label="Checked In" value={k.checkedIn.toLocaleString()} share={k.checkedInShare} tone="ok" foot={<span className="text-xs text-fg-dim">of {k.sold.toLocaleString()} ticket holders</span>} />
      <Kpi label="Attendees Remaining" value={k.remaining.toLocaleString()} share={k.remainingShare} tone="info" foot={<span className="text-xs text-fg-dim">sold but not yet arrived</span>} />
      <div className={cn("panel col-span-2 flex flex-col justify-between p-4 lg:col-span-2 2xl:col-span-1", online ? "border-ok/30" : "border-danger/60")}>
        <span className="eyebrow">System Status</span>
        <div className="mt-3 flex items-center gap-2.5">
          <span className={cn("relative flex h-3 w-3")}><span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", online ? "bg-ok" : "bg-danger")} /><span className={cn("relative inline-flex h-3 w-3 rounded-full", online ? "bg-ok" : "bg-danger")} /></span>
          <span className={cn("h-display text-[30px]", online ? "text-ok" : "text-danger")}>{online ? "Online" : "Offline"}</span>
        </div>
        <p className="mt-2 text-xs text-fg-muted">{online ? "All systems operational." : "Lost contact with the operations server."}</p>
        <p className="mt-1 text-xs text-fg-dim">{s.gates.filter((g) => g.active).length} gates open · {scanners} scanner{scanners === 1 ? "" : "s"} active</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Sales trend ───────────────────────── */
export function SalesTrendPanel({ className }: { className?: string }) {
  const { s, ix } = useOps();
  const [mode, setMode] = useState<TrendMode>("daily");
  const data = useMemo(() => salesTrend(s, ix, mode), [s, ix, mode]);
  const k = useMemo(() => kpis(s, ix), [s, ix]);
  return (
    <Panel title="Ticket Sales Trend" className={className}
      action={<Tabs label="Trend period" value={mode} onChange={setMode} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "cumulative", label: "Cumulative" }]} />}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-6">
          <div><div className="eyebrow">Tickets sold</div><div className="text-xl font-semibold tabular-nums">{k.sold.toLocaleString()}</div></div>
          <div><div className="eyebrow">Tickets remaining</div><div className="text-xl font-semibold tabular-nums">{k.unsold.toLocaleString()}</div></div>
        </div>
        {mode === "cumulative" ? <Legend items={[{ label: "Tickets sold", color: CHART.sold }, { label: "Tickets remaining", color: CHART.remaining, dashed: true }]} />
          : <span className="text-xs text-fg-dim">{mode === "daily" ? "Tickets sold per day, last 14 days" : "Tickets sold per 7-day period"} · hover for remaining</span>}
      </div>
      {data.length === 0 ? <EmptyState icon={TicketIcon} title="No sales yet" body="The trend appears after the first paid ticket." />
        : mode === "cumulative"
          ? <LinesChart data={data as never} series={[{ key: "sold", label: "Tickets sold", color: CHART.sold }, { key: "remaining", label: "Tickets remaining", color: CHART.remaining, dashed: true }]} />
          : <BarsChart data={data as never} series={{ key: "sold", label: "Tickets sold", color: CHART.sold }} extra={(r) => [["Remaining after", Number(r.remaining).toLocaleString()], ["Revenue", naira(Number(r.revenue))]]} />}
    </Panel>
  );
}

export function DistributionPanel({ className }: { className?: string }) {
  const { s, ix } = useOps();
  const rows = useMemo(() => byType(s, ix), [s, ix]);
  const total = rows.reduce((a, r) => a + r.sold, 0);
  return (
    <Panel title="Ticket Distribution" className={className}>
      <Donut size={170} centerLabel="Sold" centerValue={total.toLocaleString()} slices={rows.map((r) => ({ key: r.type.id, label: r.type.shortName, value: r.sold, color: TYPE_COLOR[r.type.id], detail: naira(r.revenue) }))} />
    </Panel>
  );
}

/* ───────────────────────── Revenue ───────────────────────── */
export function RevenuePanel({ className, chartHeight = 150 }: { className?: string; chartHeight?: number }) {
  const { s, ix } = useOps();
  const r = useMemo(() => revenue(s, ix), [s, ix]);
  const trend = useMemo(() => salesTrend(s, ix, "cumulative"), [s, ix]);
  return (
    <Panel title="Revenue Overview" className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="eyebrow">Current revenue</div><div className="text-[28px] font-semibold leading-tight tabular-nums">{naira(r.paid)}</div></div>
        <div className="text-right"><div className="eyebrow">Projected</div><div className="text-lg font-semibold tabular-nums text-fg-muted">{naira(r.target)}</div></div>
      </div>
      <Progress value={r.progress} tone="ok" label="Progress toward projected revenue" className="mt-3 h-2" />
      <p className="mt-1.5 text-xs text-fg-dim">{Math.round(r.progress * 100)}% of projection · {naira(Math.max(0, r.target - r.paid))} to go</p>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {([["Paid", r.paid, "text-ok"], ["Pending", r.pending, "text-warn"], ["Refunded", r.refunded, "text-info"]] as const).map(([label, v, color]) => (
          <div key={label} className="border border-ink-600 bg-ink-900 p-2.5"><dt className={cn("flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em]", color)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</dt><dd className="mt-1 truncate text-sm font-semibold tabular-nums" title={naira(v)}>{naira(v, { compact: true })}</dd></div>
        ))}
      </dl>
      <div className="mt-4"><div className="eyebrow mb-1">Cumulative revenue</div>
        <AreaTrend data={trend as never} series={{ key: "revenue", label: "Revenue", color: CHART.revenue, format: naira }} yFormat={compactNaira} height={chartHeight} /></div>
    </Panel>
  );
}

export function PaymentMethodsPanel({ className }: { className?: string }) {
  const { s } = useOps();
  const rows = useMemo(() => byMethod(s), [s]);
  const statuses = useMemo(() => byStatus(s), [s]);
  return (
    <Panel title="Payment Methods" className={className}>
      <Donut size={150} centerLabel="Txns" centerValue={rows.reduce((a, r) => a + r.transactions, 0).toLocaleString()} slices={rows.map((r) => ({ key: r.method, label: METHOD_LABEL[r.method], value: r.transactions, color: METHOD_COLOR[r.method], detail: `${naira(r.amount)} paid` }))} />
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink-600 pt-4 sm:grid-cols-4">
        {statuses.map((st) => <div key={st.status}><PaymentBadge status={st.status} /><div className="mt-1 text-sm font-semibold tabular-nums">{st.count}<span className="ml-1.5 text-xs font-normal text-fg-dim">{naira(st.amount, { compact: true })}</span></div></div>)}
      </div>
    </Panel>
  );
}

export function SalesByTypeTable({ className, detailed }: { className?: string; detailed?: boolean }) {
  const { s, ix } = useOps();
  const rows = useMemo(() => byType(s, ix), [s, ix]);
  const total = { sold: rows.reduce((a, r) => a + r.sold, 0), revenue: rows.reduce((a, r) => a + r.revenue, 0), capacity: rows.reduce((a, r) => a + r.capacity, 0), available: rows.reduce((a, r) => a + r.available, 0) };
  return (
    <Panel title="Sales by Ticket Type" className={className} bodyClassName="p-0">
      <TableWrap>
        <table className="tbl">
          <thead><tr><th>Type</th><th className="num">Price</th><th className="num">Sold</th>{detailed && <><th className="num">Available</th><th>Sell-through</th></>}<th className="num">Revenue</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.type.id}>
                <td><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0" style={{ background: TYPE_COLOR[r.type.id] }} />{r.type.shortName}</span></td>
                <td className="num text-fg-muted">{naira(r.type.price)}</td>
                <td className="num">{r.sold}</td>
                {detailed && <><td className="num text-fg-muted">{r.available}</td><td className="min-w-[120px]"><div className="flex items-center gap-2"><Progress value={r.sold / r.capacity} label={`${r.type.name} sell-through`} tone={r.type.tier === "standard" ? "acl" : "gold"} /><span className="w-9 text-right text-xs tabular-nums text-fg-dim">{pct(r.sold, r.capacity)}%</span></div></td></>}
                <td className="num font-medium">{naira(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-ink-800 font-semibold"><td className="px-3 py-2.5">Total</td><td /><td className="px-3 py-2.5 text-right tabular-nums">{total.sold}</td>{detailed && <><td className="px-3 py-2.5 text-right tabular-nums">{total.available}</td><td /></>}<td className="px-3 py-2.5 text-right tabular-nums">{naira(total.revenue)}</td></tr></tfoot>
        </table>
      </TableWrap>
    </Panel>
  );
}

/* ───────────────────────── Recent sales ───────────────────────── */
type Channel = "ALL" | "ONLINE" | "POS" | "BANK" | "USSD" | "CASH";
export function RecentSalesTable({ className, pageSize = 8 }: { className?: string; pageSize?: number }) {
  const { s, ix } = useOps();
  const { openTicket } = useUi();
  const [channel, setChannel] = useState<Channel>("ALL");
  const all = useMemo(() => ticketRows(s, ix).sort((a, b) => b.ticket.createdAt.localeCompare(a.ticket.createdAt)), [s, ix]);
  const rows = useMemo(() => all.filter((r) => channel === "ALL" || channelOf(r.payment) === channel), [all, channel]);
  const p = usePaged(rows, pageSize);
  const count = (c: Channel) => (c === "ALL" ? all.length : all.filter((r) => channelOf(r.payment) === c).length);
  const exportCsv = () => downloadCsv(`acl-ticket-sales-${channel.toLowerCase()}`, ["Ticket ID", "Name", "Type", "Amount (NGN)", "Payment Method", "Status", "Agent", "Time"], rows.map((r) => [r.ticket.id, r.attendee.name, r.type.name, r.ticket.pricePaid, METHOD_LABEL[r.payment.method], r.payment.status, r.ticket.agentId ?? "", dateTime(r.ticket.createdAt)]));
  return (
    <Panel title="Recent Ticket Sales" className={className} bodyClassName="p-0 flex flex-col"
      action={<Button size="sm" onClick={exportCsv} disabled={rows.length === 0}><Download className="h-3.5 w-3.5" />Export</Button>}>
      <div className="border-b border-ink-600 p-2">
        <Tabs label="Sales channel" value={channel} onChange={(c) => { setChannel(c); p.setPage(0); }} options={([["ALL", "All"], ["ONLINE", "Online"], ["POS", "POS / Agents"], ["BANK", "Bank Transfer"], ["USSD", "USSD"], ["CASH", "Cash"]] as const).map(([value, label]) => ({ value, label, count: count(value) }))} />
      </div>
      {rows.length === 0 ? <EmptyState icon={TicketIcon} title="No sales on this channel" body="Sales will appear here as they happen." /> : (
        <TableWrap className="flex-1">
          <table className="tbl">
            <thead><tr><th>Ticket ID</th><th>Name</th><th>Type</th><th className="num">Amount</th><th>Payment Method</th><th>Status</th><th className="num">Time</th></tr></thead>
            <tbody>
              {p.slice.map((r) => (
                <tr key={r.ticket.id} tabIndex={0} role="button" aria-label={`Open ${r.ticket.id}`} className="cursor-pointer" onClick={() => openTicket(r.ticket.id)} onKeyDown={(e) => { if (e.key === "Enter") openTicket(r.ticket.id); }}>
                  <td className="ticket-id">{r.ticket.id}</td>
                  <td className="max-w-[180px] truncate">{r.attendee.name}</td>
                  <td><span className="flex items-center gap-2"><span className="h-2 w-2 shrink-0" style={{ background: TYPE_COLOR[r.type.id] }} />{r.type.shortName}</span></td>
                  <td className="num">{naira(r.ticket.pricePaid)}</td>
                  <td className="text-fg-muted">{METHOD_LABEL[r.payment.method]}{r.ticket.agentId && <span className="ml-1.5 font-mono text-[11px] text-fg-dim">{r.ticket.agentId}</span>}</td>
                  <td><PaymentBadge status={r.payment.status} /></td>
                  <td className="num text-fg-muted">{dateTime(r.ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pager p={p} noun="sales" />
    </Panel>
  );
}

/* ───────────────────────── Check-in widgets ───────────────────────── */
export function RecentScanCard({ className }: { className?: string }) {
  const { s, ix } = useOps();
  const last = s.checkIns[s.checkIns.length - 1] as CheckIn | undefined;
  const t = last?.ticketId ? ix.ticket.get(last.ticketId) : undefined;
  const ok = last?.result === "GRANTED";
  return (
    <Panel title="Recent Scan" className={cn(className, last && !ok && last.reason !== "WRONG_GATE" && "border-danger/50")}>
      {!last ? <EmptyState icon={ShieldCheck} title="No scans yet" body="The latest gate scan shows here." /> : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="ticket-id truncate text-base">{t?.id ?? last.presented.slice(0, 28)}</div>
              <div className="mt-1 truncate text-lg font-semibold">{t ? ix.attendee.get(t.attendeeId)?.name : "Unknown holder"}</div>
              <div className="text-sm text-fg-muted">{t ? `${ix.type.get(t.typeId)!.name} — ${naira(t.pricePaid)}` : REASON_LABEL[last.reason]}</div>
            </div>
            <Badge tone={ok ? "ok" : "danger"} className="text-xs">{ok ? "Valid" : "Rejected"}</Badge>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-fg-muted"><span className="tabular-nums">{time(last.at)}</span><span className="truncate">{ix.gate.get(last.gateId)?.name}</span></div>
          <div className={cn("mt-3 flex items-center justify-center gap-2 py-2.5 font-display text-lg font-bold uppercase tracking-[0.18em]", ok ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger")}>
            {ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}{ok ? "Access granted" : "Access denied"}
          </div>
          {!ok && <p className="mt-2 text-xs text-danger">{last.message}</p>}
        </div>
      )}
    </Panel>
  );
}

export function CheckInAnalytics({ className, showLink = true }: { className?: string; showLink?: boolean }) {
  const { s, ix, can } = useOps();
  const c = useMemo(() => checkInStats(s, ix), [s, ix]);
  return (
    <Panel title="Check-In Analytics" className={className}>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="border border-ink-600 bg-ink-900 p-3"><dt className="eyebrow">Total checked in</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-ok">{c.total}</dd></div>
        <div className="border border-ink-600 bg-ink-900 p-3"><dt className="eyebrow">Last 1 hour</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{c.lastHour}</dd></div>
        <div className="border border-ink-600 bg-ink-900 p-3"><dt className="eyebrow">Avg scan speed</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{c.avgSpeedSec === null ? "—" : `${c.avgSpeedSec.toFixed(1)}`}<span className="ml-1 text-sm font-normal text-fg-dim">sec</span></dd></div>
      </dl>
      <ul className="mt-3 space-y-1.5 text-sm">
        {c.byGate.map((g) => <li key={g.gate.id} className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><span className={cn("h-1.5 w-1.5 rounded-full", g.gate.active ? "bg-ok" : "bg-fg-dim")} /><span className="truncate text-fg-muted">{g.gate.name}</span></span><span className="shrink-0 tabular-nums">{g.granted}<span className="ml-2 text-xs text-danger">{g.rejected > 0 ? `${g.rejected} rejected` : ""}</span></span></li>)}
      </ul>
      {showLink && can("checkin.log") && <Link href="/check-in/log" className="mt-4 flex h-10 items-center justify-center border border-ink-500 bg-ink-800 font-display text-sm font-semibold uppercase tracking-[0.1em] transition hover:border-fg-dim hover:bg-ink-700">View Check-In Log</Link>}
    </Panel>
  );
}

export function SecurityFeed({ className, limit = 7 }: { className?: string; limit?: number }) {
  const { s, ix } = useOps();
  const { openTicket } = useUi();
  const feed = useMemo(() => s.checkIns.slice(-limit).reverse(), [s.checkIns, limit]);
  const alerts = s.securityEvents.filter((e) => e.severity === "CRITICAL").length;
  return (
    <Panel title="Security Events" className={className} bodyClassName="p-0" action={<Badge tone={alerts ? "danger" : "ok"} dot>{alerts} critical</Badge>}>
      {feed.length === 0 ? <EmptyState icon={ShieldAlert} title="No gate activity" body="Every scan — granted or rejected — is logged here." /> : (
        <ol>
          {feed.map((c) => { const ok = c.result === "GRANTED"; const ref = c.ticketId ?? c.presented.slice(0, 24); return (
            <li key={c.id} className={cn("border-b border-ink-700 last:border-0", !ok && c.reason === "DUPLICATE" && "bg-danger/[0.07]")}>
              <button type="button" disabled={!c.ticketId} onClick={() => c.ticketId && openTicket(c.ticketId)} className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 px-4 py-2.5 text-left enabled:hover:bg-white/[0.03]">
                <time className="text-xs tabular-nums text-fg-dim">{time(c.at)}</time>
                <span className="min-w-0"><span className={cn("block truncate text-sm font-medium", !ok && c.reason !== "WRONG_GATE" && "text-danger")}>{REASON_LABEL[c.reason]}</span><span className="ticket-id block truncate text-fg-muted">{ref} <span className="font-sans text-fg-dim">· {ix.gate.get(c.gateId)?.name}</span></span></span>
                <ScanBadge result={c.result} reason={c.reason} />
              </button>
            </li>
          ); })}
        </ol>
      )}
    </Panel>
  );
}
