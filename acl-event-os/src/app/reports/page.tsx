"use client";

import { useState } from "react";
import {
  BarChart3, Download, Printer, Ticket, Banknote, CreditCard, ScanLine, Store, Layers, ShieldAlert,
} from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { DataTable, Th, Td, Tr, EmptyState, TableSkeleton } from "@/components/ui/Table";
import { useAcl } from "@/lib/client/provider";
import { apiGet, downloadCsv } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { printHtml } from "@/lib/client/eticket";
import { formatDateTime, formatNaira, formatNumber } from "@/lib/domain/format";
import type { HeadlineStats } from "@/lib/domain/stats";

const REPORTS = [
  { kind: "ticket-sales", title: "Ticket Sales", icon: Ticket, body: "Every ticket issued, with tier, channel, payment state and time." },
  { kind: "revenue", title: "Revenue", icon: Banknote, body: "Daily revenue, cumulative totals and inventory remaining." },
  { kind: "payments", title: "Payments", icon: CreditCard, body: "All transactions with method, reference and settlement." },
  { kind: "check-in", title: "Check-In", icon: ScanLine, body: "The complete gate audit trail, granted and refused." },
  { kind: "agent-performance", title: "Agent Performance", icon: Store, body: "Field sales, revenue and commission per agent." },
  { kind: "ticket-type-performance", title: "Ticket Type Performance", icon: Layers, body: "Allocation, sell-through and revenue by tier." },
  { kind: "security-events", title: "Security Events", icon: ShieldAlert, body: "Duplicates, forgeries and every refused scan." },
] as const;

interface ReportData {
  kind: string;
  title: string;
  rows: Array<Record<string, unknown>>;
  generatedAt: string;
  event: { name: string; startsAt: string; venue: string; location: string };
  summary: HeadlineStats;
}

export default function ReportsPage() {
  return (
    <Guard permission="reports.view">
      <Reports />
    </Guard>
  );
}

function Reports() {
  const { allows } = useAcl();
  const toast = useToast();
  const [active, setActive] = useState<string>("ticket-sales");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(kind: string) {
    setActive(kind);
    setLoading(true);
    try {
      setData(await apiGet<ReportData>(`/api/reports/${kind}`));
    } catch (err) {
      toast.push({ tone: "error", title: "Could not build report", body: err instanceof Error ? err.message : "" });
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv(kind: string) {
    try {
      await downloadCsv(`/api/reports/${kind}?format=csv`, `acl-${kind}-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.push({ tone: "success", title: "Export ready", body: `${kind.replace(/-/g, " ")} downloaded.` });
    } catch (err) {
      toast.push({ tone: "error", title: "Export failed", body: err instanceof Error ? err.message : "" });
    }
  }

  function print() {
    if (!data) return;
    const headers = data.rows.length ? Object.keys(data.rows[0]) : [];
    const esc = (v: unknown) =>
      String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>ACL — ${esc(data.title)}</title>
<style>
  *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;margin:28px;color:#111}
  h1{font-size:20px;margin:0;letter-spacing:-.4px;text-transform:uppercase}
  .sub{color:#555;font-size:11px;margin-top:4px}
  .kpi{display:flex;gap:26px;margin:18px 0;padding:12px 0;border-top:2px solid #111;border-bottom:1px solid #ccc}
  .kpi div span{display:block;font-size:9px;letter-spacing:1.5px;color:#666;text-transform:uppercase}
  .kpi div b{font-size:15px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{text-align:left;background:#f2f2f2;padding:6px;border-bottom:1px solid #bbb;text-transform:uppercase;letter-spacing:.6px;font-size:9px}
  td{padding:5px 6px;border-bottom:1px solid #eee}
  tr:nth-child(even) td{background:#fafafa}
  .ft{margin-top:20px;font-size:9px;color:#888;letter-spacing:1px;text-transform:uppercase}
</style></head><body>
<h1>ACL — ${esc(data.title)} Report</h1>
<div class="sub">${esc(data.event.name)} · ${esc(data.event.venue)}, ${esc(data.event.location)} · generated ${formatDateTime(data.generatedAt)}</div>
<div class="kpi">
  <div><span>Tickets sold</span><b>${formatNumber(data.summary.ticketsSold)}</b></div>
  <div><span>Revenue</span><b>${formatNaira(data.summary.revenue)}</b></div>
  <div><span>Checked in</span><b>${formatNumber(data.summary.checkedIn)}</b></div>
  <div><span>Records</span><b>${formatNumber(data.rows.length)}</b></div>
</div>
<table><thead><tr>${headers.map((h) => `<th>${esc(h.replace(/_/g, " "))}</th>`).join("")}</tr></thead>
<tbody>${data.rows
      .map((row) => `<tr>${headers.map((h) => `<td>${esc(row[h])}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>
<div class="ft">ACL — Africa Combat League · Built by fighters for fighters</div>
</body></html>`);
  }

  const headers = data?.rows.length ? Object.keys(data.rows[0]) : [];
  const preview = data?.rows.slice(0, 40) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="ACL Reporting"
        title="Reports"
        description="Operational and financial reports built from live event data. Export to CSV, or print a clean report view."
      />

      <div className="space-y-3 p-3 sm:p-4 lg:p-5">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {REPORTS.map((report) => {
            const Icon = report.icon;
            const isActive = active === report.kind;
            return (
              <button
                key={report.kind}
                onClick={() => load(report.kind)}
                className={`flex flex-col items-start gap-2 rounded-[3px] border p-3.5 text-left transition-all ${
                  isActive
                    ? "border-acl-red bg-acl-red/[0.08]"
                    : "border-hairline-strong bg-surface-2 hover:border-acl-red/50 hover:bg-surface-3"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-acl-red-bright" : "text-ink-3"}`} />
                <span className="font-display text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                  {report.title}
                </span>
                <span className="text-[11px] leading-relaxed text-ink-4">{report.body}</span>
              </button>
            );
          })}
        </div>

        <Panel>
          <PanelHeader
            title={data ? `${data.title} Report` : "Report Preview"}
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            subtitle={data ? `${formatNumber(data.rows.length)} records · generated ${formatDateTime(data.generatedAt)}` : "Select a report above"}
            action={
              data ? (
                <>
                  <Button size="sm" variant="outline" onClick={print}>
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                  {allows("reports.export") ? (
                    <Button size="sm" variant="primary" onClick={() => exportCsv(active)}>
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </Button>
                  ) : null}
                </>
              ) : null
            }
          />

          {loading ? (
            <TableSkeleton rows={10} cols={6} />
          ) : !data ? (
            <EmptyState
              title="No report selected"
              body="Choose a report above to preview its rows, export to CSV or print it."
              icon={<BarChart3 className="h-5 w-5" />}
              action={
                <Button variant="primary" size="sm" onClick={() => load("ticket-sales")}>
                  Build ticket sales report
                </Button>
              }
            />
          ) : !data.rows.length ? (
            <EmptyState title="No records" body="This report has no rows for the current event." />
          ) : (
            <>
              <DataTable>
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <Th key={header}>{header.replace(/_/g, " ")}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <Tr key={i}>
                      {headers.map((header) => (
                        <Td key={header} mono={header.includes("id") || header.includes("ngn")}>
                          {String(row[header] ?? "—")}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
              {data.rows.length > preview.length ? (
                <p className="border-t border-hairline px-4 py-2.5 text-[11px] text-ink-4">
                  Showing the first {preview.length} of {formatNumber(data.rows.length)} rows. Export or print for
                  the full report.
                </p>
              ) : null}
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
