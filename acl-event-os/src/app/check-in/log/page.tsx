"use client";

import { ArrowLeft, Download, ListChecks } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useOps } from "@/components/ops-provider";
import { Badge, Button, EmptyState, PageHeader, Pager, Panel, ScanBadge, SearchInput, TableWrap, Tabs, usePaged } from "@/components/ui";
import { useUi } from "@/components/ui-context";
import { cn } from "@/lib/cn";
import { downloadCsv } from "@/lib/csv";
import { dateTime, REASON_LABEL, timeSec } from "@/lib/format";
import type { CheckIn } from "@/lib/types";

type Filter = "ALL" | "GRANTED" | "REJECTED" | "DUPLICATE" | "INVALID" | "PENDING";
const INVALID = new Set(["NOT_FOUND", "MALFORMED", "TAMPERED_QR", "UNSIGNED_QR", "WRONG_EVENT"]);
const match = (c: CheckIn, f: Filter) =>
  f === "ALL" || (f === "GRANTED" && c.result === "GRANTED") || (f === "REJECTED" && c.result === "REJECTED") || (f === "DUPLICATE" && c.reason === "DUPLICATE") || (f === "INVALID" && INVALID.has(c.reason)) || (f === "PENDING" && c.reason === "PAYMENT_PENDING");

export default function CheckInLogPage() {
  const { s, ix } = useOps();
  const { openTicket } = useUi();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [gate, setGate] = useState("");
  const all = useMemo(() => [...s.checkIns].reverse(), [s.checkIns]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase(); const digits = needle.replace(/\D/g, "");
    return all.filter((c) => {
      if (!match(c, filter) || (gate && c.gateId !== gate)) return false;
      if (!needle) return true;
      const t = c.ticketId ? ix.ticket.get(c.ticketId) : undefined; const a = t && ix.attendee.get(t.attendeeId);
      return (c.ticketId ?? c.presented).toLowerCase().includes(needle) || !!a?.name.toLowerCase().includes(needle) || (digits.length >= 4 && !!a?.phone.replace(/\D/g, "").includes(digits));
    });
  }, [all, filter, q, gate, ix]);
  const p = usePaged(rows, 15);
  const holder = (c: CheckIn) => { const t = c.ticketId ? ix.ticket.get(c.ticketId) : undefined; return { t, a: t && ix.attendee.get(t.attendeeId), type: t && ix.type.get(t.typeId) }; };
  const exportCsv = () => downloadCsv("acl-check-in-log", ["Scan ID", "Ticket ID", "Name", "Ticket Type", "Gate", "Operator", "Device", "Mode", "Time", "Result", "Reason", "Detail"],
    rows.map((c) => { const h = holder(c); return [c.id, c.ticketId ?? c.presented, h.a?.name ?? "", h.type?.name ?? "", ix.gate.get(c.gateId)?.name ?? c.gateId, ix.user.get(c.operatorId)?.name ?? c.operatorId, c.deviceId, c.mode, dateTime(c.at), c.result, REASON_LABEL[c.reason], c.message]; }));

  return (
    <div>
      <PageHeader title="Check-In Log" subtitle="The complete audit trail: every scan attempt with its result, reason, gate, operator and device.">
        <Link href="/check-in" className="inline-flex h-10 items-center gap-2 px-3 font-display text-sm font-semibold uppercase tracking-[0.1em] text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" />Scanner</Link>
        <Button onClick={exportCsv} disabled={rows.length === 0}><Download className="h-4 w-4" />Export CSV</Button>
      </PageHeader>
      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-600 p-3">
          <Tabs label="Result filter" value={filter} onChange={(f) => { setFilter(f); p.setPage(0); }} options={([["ALL", "All"], ["GRANTED", "Granted"], ["REJECTED", "Rejected"], ["DUPLICATE", "Duplicate"], ["INVALID", "Invalid"], ["PENDING", "Pending Payment"]] as const).map(([value, label]) => ({ value, label, count: all.filter((c) => match(c, value)).length }))} />
          <select aria-label="Gate" className="input h-9 w-auto" value={gate} onChange={(e) => { setGate(e.target.value); p.setPage(0); }}><option value="">All gates</option>{s.gates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <SearchInput className="min-w-[220px] flex-1" value={q} onChange={(v) => { setQ(v); p.setPage(0); }} placeholder="Search ticket ID, name or phone" />
        </div>
        {rows.length === 0 ? <EmptyState icon={ListChecks} title="No scans match" body="Try a different filter or clear the search." action={<Button onClick={() => { setFilter("ALL"); setQ(""); setGate(""); }}>Clear filters</Button>} /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Ticket ID</th><th>Name</th><th>Ticket Type</th><th>Gate</th><th>Operator</th><th>Device</th><th className="num">Time</th><th>Result</th><th>Reason</th></tr></thead>
              <tbody>
                {p.slice.map((c) => { const h = holder(c); const alert = c.reason === "DUPLICATE" || c.reason === "TAMPERED_QR"; return (
                  <tr key={c.id} className={cn(alert && "bg-danger/[0.06]", h.t && "cursor-pointer")} tabIndex={h.t ? 0 : undefined} onClick={() => h.t && openTicket(h.t.id)} onKeyDown={(e) => { if (e.key === "Enter" && h.t) openTicket(h.t.id); }}>
                    <td className="ticket-id max-w-[220px] truncate" title={c.presented}>{c.ticketId ?? c.presented}</td>
                    <td className="max-w-[170px] truncate">{h.a?.name ?? <span className="text-fg-dim">—</span>}</td>
                    <td className="text-fg-muted">{h.type?.name ?? "—"}</td>
                    <td>{ix.gate.get(c.gateId)?.name}</td>
                    <td className="text-fg-muted">{ix.user.get(c.operatorId)?.name}</td>
                    <td className="font-mono text-xs text-fg-dim">{c.deviceId}{c.mode === "MANUAL" && <Badge className="ml-2">Manual</Badge>}</td>
                    <td className="num text-fg-muted">{timeSec(c.at)}</td>
                    <td><ScanBadge result={c.result} reason={c.reason} /></td>
                    <td className={cn("max-w-[280px] truncate", c.result === "REJECTED" ? (c.reason === "WRONG_GATE" ? "text-warn" : "text-danger") : "text-fg-muted")} title={c.message}>{REASON_LABEL[c.reason]}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </TableWrap>
        )}
        <Pager p={p} noun="scans" />
      </Panel>
    </div>
  );
}
