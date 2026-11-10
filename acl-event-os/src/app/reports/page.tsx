"use client";

import { Download, FileBarChart, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { useOps } from "@/components/ops-provider";
import { Logo } from "@/components/shell/logo";
import { Button, EmptyState, PageHeader, Pager, Panel, TableWrap, usePaged } from "@/components/ui";
import { cn } from "@/lib/cn";
import { downloadCsv, type Cell } from "@/lib/csv";
import { date, dateTime, METHOD_LABEL, naira, pct, REASON_LABEL } from "@/lib/format";
import { agentStats, byMethod, byStatus, byType, checkInStats, kpis, revenue, salesTrend, ticketRows, type Index } from "@/lib/metrics";
import type { Snapshot } from "@/lib/types";

interface Report { id: string; title: string; description: string; columns: string[]; numeric: number[]; rows: Cell[][]; summary: [string, string][] }

/** Each report is a pure function of the snapshot — what you preview is exactly what exports. */
function buildReports(s: Snapshot, ix: Index): Report[] {
  const k = kpis(s, ix); const rev = revenue(s, ix); const types = byType(s, ix); const ci = checkInStats(s, ix);
  const rows = ticketRows(s, ix).sort((a, b) => b.ticket.createdAt.localeCompare(a.ticket.createdAt));
  const days = salesTrend(s, ix, "cumulative"); const daily = salesTrend(s, ix, "daily");
  const perDay = days.map((d, i) => ({ ...d, daySold: d.sold - (days[i - 1]?.sold ?? 0), dayRev: d.revenue - (days[i - 1]?.revenue ?? 0) }));
  void daily;
  const agents = agentStats(s, ix);
  return [
    { id: "sales", title: "Ticket Sales", description: "Every ticket issued, newest first.", columns: ["Ticket ID", "Name", "Phone", "Type", "Amount", "Method", "Agent", "Payment", "Ticket status", "Purchased"], numeric: [4],
      rows: rows.map((r) => [r.ticket.id, r.attendee.name, r.attendee.phone, r.type.name, r.ticket.pricePaid, METHOD_LABEL[r.payment.method], r.ticket.agentId ?? "", r.payment.status, r.ticket.status, dateTime(r.ticket.createdAt)]),
      summary: [["Tickets sold", `${k.sold} / ${k.capacity}`], ["Sell-through", `${Math.round(k.soldShare * 100)}%`], ["Records", String(rows.length)]] },
    { id: "revenue", title: "Revenue", description: "Paid revenue by day with running total.", columns: ["Date", "Tickets sold", "Revenue", "Cumulative tickets", "Cumulative revenue"], numeric: [1, 2, 3, 4],
      rows: perDay.map((d) => [d.label, d.daySold, d.dayRev, d.sold, d.revenue]),
      summary: [["Paid", naira(rev.paid)], ["Pending", naira(rev.pending)], ["Refunded", naira(rev.refunded)], ["Projected", naira(rev.target)], ["Progress", `${Math.round(rev.progress * 100)}%`]] },
    { id: "payments", title: "Payments", description: "All transactions with status and reference.", columns: ["Transaction ID", "Ticket ID(s)", "Customer", "Amount", "Method", "Status", "Reference", "Date"], numeric: [3],
      rows: [...s.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => [p.id, p.ticketIds.join(" "), ix.attendee.get(p.attendeeId)?.name ?? "", p.amount, METHOD_LABEL[p.method], p.status, p.reference, dateTime(p.createdAt)]),
      summary: [...byStatus(s).map((x) => [x.status[0] + x.status.slice(1).toLowerCase(), `${x.count} · ${naira(x.amount)}`] as [string, string]), ...byMethod(s).map((m) => [METHOD_LABEL[m.method], `${m.transactions} txns`] as [string, string])] },
    { id: "checkin", title: "Check-In", description: "Full scan audit log.", columns: ["Scan ID", "Ticket", "Name", "Type", "Gate", "Operator", "Device", "Mode", "Time", "Result", "Reason"], numeric: [],
      rows: [...s.checkIns].reverse().map((c) => { const t = c.ticketId ? ix.ticket.get(c.ticketId) : undefined; return [c.id, c.ticketId ?? c.presented, t ? ix.attendee.get(t.attendeeId)?.name ?? "" : "", t ? ix.type.get(t.typeId)?.name ?? "" : "", ix.gate.get(c.gateId)?.name ?? "", ix.user.get(c.operatorId)?.name ?? "", c.deviceId, c.mode, dateTime(c.at), c.result, REASON_LABEL[c.reason]]; }),
      summary: [["Checked in", `${ci.total} of ${k.sold} (${Math.round(k.checkedInShare * 100)}%)`], ["Still to arrive", String(k.remaining)], ["Rejected scans", String(ci.rejected)], ["Avg scan speed", ci.avgSpeedSec === null ? "—" : `${ci.avgSpeedSec.toFixed(1)} sec`]] },
    { id: "agents", title: "Agent Performance", description: "Sales, revenue and commission per agent.", columns: ["Agent ID", "Name", "Location", "Status", "Tickets", "Revenue", "Rate %", "Commission"], numeric: [4, 5, 6, 7],
      rows: agents.map((a) => [a.agent.id, a.agent.name, a.agent.location, a.agent.status, a.sales, a.revenue, Math.round(a.agent.commissionRate * 100), a.commission]),
      summary: [["Agent tickets", String(agents.reduce((x, a) => x + a.sales, 0))], ["Agent revenue", naira(agents.reduce((x, a) => x + a.revenue, 0))], ["Commission owed", naira(agents.reduce((x, a) => x + a.commission, 0))]] },
    { id: "types", title: "Ticket Type Performance", description: "Inventory and revenue per ticket type.", columns: ["Type", "Price", "Capacity", "Sold", "Available", "Reserved", "Checked in", "Sell-through %", "Revenue"], numeric: [1, 2, 3, 4, 5, 6, 7, 8],
      rows: types.map((t) => [t.type.name, t.type.price, t.capacity, t.sold, t.available, t.reserved, t.checkedIn, pct(t.sold, t.capacity), t.revenue]),
      summary: [["Total sold", String(k.sold)], ["Total revenue", naira(k.revenue)], ["Best seller", [...types].sort((a, b) => b.sold - a.sold)[0]?.type.name ?? "—"], ["Top earner", [...types].sort((a, b) => b.revenue - a.revenue)[0]?.type.name ?? "—"]] },
    { id: "security", title: "Security Events", description: "Rejected scans and fraud signals.", columns: ["Time", "Severity", "Event", "Ticket / payload", "Gate", "Operator", "Device", "Detail"], numeric: [],
      rows: [...s.securityEvents].reverse().map((e) => [dateTime(e.at), e.severity, e.title, e.ticketRef, ix.gate.get(e.gateId)?.name ?? "", ix.user.get(e.operatorId)?.name ?? "", e.deviceId, e.detail]),
      summary: [["Events", String(s.securityEvents.length)], ["Critical", String(s.securityEvents.filter((e) => e.severity === "CRITICAL").length)], ["Duplicate attempts", String(ci.duplicates)]] },
  ];
}

const MONEY = /amount|revenue|price|commission/i;

export default function ReportsPage() {
  const { s, ix } = useOps();
  const reports = useMemo(() => buildReports(s, ix), [s, ix]);
  const [id, setId] = useState("sales");
  const r = reports.find((x) => x.id === id)!;
  const p = usePaged(r.rows, 15);
  const show = (v: Cell, col: number) => (typeof v === "number" && MONEY.test(r.columns[col]) ? naira(v) : typeof v === "number" ? v.toLocaleString() : v ?? "");
  const stamp = `${date(s.now)}`.replace(/\s/g, "-").toLowerCase();

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generated live from event records. Export to CSV or print a clean copy.">
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print / Save PDF</Button>
        <Button variant="primary" disabled={r.rows.length === 0} onClick={() => downloadCsv(`acl-${r.id}-report-${stamp}`, r.columns, r.rows)}><Download className="h-4 w-4" />Export CSV</Button>
      </PageHeader>
      <div className="no-print mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-7" role="tablist" aria-label="Report">
        {reports.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === id} onClick={() => { setId(x.id); p.setPage(0); }} className={cn("panel p-3 text-left transition", x.id === id ? "border-acl bg-acl/10" : "hover:border-fg-dim")}>
            <span className="h-display block text-sm tracking-[0.1em]">{x.title}</span><span className="mt-1 block text-xs tabular-nums text-fg-dim">{x.rows.length.toLocaleString()} rows</span>
          </button>
        ))}
      </div>

      <div className="print-area">
        <div className="mb-4 hidden items-center justify-between border-b pb-3 print:flex"><Logo /><div className="text-right text-xs"><div className="font-semibold">{s.event.name}</div><div>{r.title} report · generated {dateTime(s.now)}</div></div></div>
        <Panel title={`${r.title} Report`} eyebrow={r.description} bodyClassName="p-0">
          <dl className="flex flex-wrap gap-x-8 gap-y-3 border-b border-ink-600 p-4">{r.summary.map(([k2, v]) => <div key={k2}><dt className="eyebrow">{k2}</dt><dd className="mt-0.5 text-base font-semibold tabular-nums">{v}</dd></div>)}</dl>
          {r.rows.length === 0 ? <EmptyState icon={FileBarChart} title="Nothing to report yet" body="This report fills in as activity is recorded." /> : (
            <>
              <TableWrap className="print:hidden">
                <table className="tbl"><thead><tr>{r.columns.map((c, i) => <th key={c} className={cn(r.numeric.includes(i) && "num")}>{c}</th>)}</tr></thead>
                  <tbody>{p.slice.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className={cn("max-w-[260px] truncate", r.numeric.includes(j) && "num", j === 0 && "ticket-id")}>{show(v, j)}</td>)}</tr>)}</tbody></table>
              </TableWrap>
              {/* Print view: every row, no pagination. */}
              <table className="tbl hidden text-[10px] print:table"><thead><tr>{r.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{r.rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className="!whitespace-normal !py-1">{show(v, j)}</td>)}</tr>)}</tbody></table>
            </>
          )}
          <Pager p={p} />
        </Panel>
      </div>
    </div>
  );
}
