"use client";

import { Download, Eye, Send, Undo2, UserPlus, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useOps } from "@/components/ops-provider";
import { Badge, Button, EmptyState, PageHeader, Pager, Panel, PaymentBadge, SearchInput, TableWrap, useConfirm, usePaged } from "@/components/ui";
import { useUi } from "@/components/ui-context";
import { downloadCsv } from "@/lib/csv";
import { dateTime, naira } from "@/lib/format";
import { ticketRows } from "@/lib/metrics";
import { TYPE_COLOR } from "@/lib/theme";

function Attendees() {
  const { s, ix, can, call } = useOps();
  const { openTicket, openSell, openSend } = useUi();
  const confirm = useConfirm();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => { const v = params.get("q"); if (v !== null) setQ(v); }, [params]);
  const [type, setType] = useState("");
  const [pay, setPay] = useState("");
  const [arrival, setArrival] = useState("");
  const all = useMemo(() => ticketRows(s, ix).sort((a, b) => b.ticket.createdAt.localeCompare(a.ticket.createdAt)), [s, ix]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase(); const digits = needle.replace(/\D/g, "");
    return all.filter((r) => (!type || r.type.id === type) && (!pay || r.payment.status === pay) && (!arrival || r.checkIn === arrival) &&
      (!needle || r.ticket.id.toLowerCase().includes(needle) || r.attendee.name.toLowerCase().includes(needle) || r.attendee.email.includes(needle) || (digits.length >= 4 && r.attendee.phone.replace(/\D/g, "").includes(digits))));
  }, [all, q, type, pay, arrival]);
  const p = usePaged(rows, 14);
  const filtered = !!(q || type || pay || arrival);

  async function refund(r: (typeof rows)[number]) {
    const res = await confirm({ title: "Refund this ticket?", danger: true, confirmLabel: "Refund", reason: { label: "Reason for refund" },
      body: <>Refund <b className="text-fg">{naira(r.payment.amount)}</b> to {r.attendee.name}. {r.payment.ticketIds.length > 1 ? `All ${r.payment.ticketIds.length} tickets on this order become invalid.` : <>Ticket <span className="ticket-id">{r.ticket.id}</span> becomes invalid.</>} This cannot be undone.</> });
    if (!res.ok) return;
    try { await call("payments.refund", { paymentId: r.payment.id, reason: res.reason }); toast.success(`${r.ticket.id} refunded`); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Attendees" subtitle="Everyone holding, awaiting or returned a ticket for this event.">
        <Button onClick={() => downloadCsv("acl-attendees", ["Name", "Phone", "Email", "Ticket", "Ticket Type", "Payment Status", "Check-In Status", "Purchase Date"], rows.map((r) => [r.attendee.name, r.attendee.phone, r.attendee.email, r.ticket.id, r.type.name, r.payment.status, r.checkIn, dateTime(r.ticket.createdAt)]))} disabled={rows.length === 0}><Download className="h-4 w-4" />Export</Button>
        {can("tickets.sell") && <Button variant="primary" onClick={() => openSell({ mode: "attendee" })}><UserPlus className="h-4 w-4" />Add Attendee</Button>}
      </PageHeader>
      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-600 p-3">
          <SearchInput className="min-w-[240px] flex-1" value={q} onChange={(v) => { setQ(v); p.setPage(0); }} placeholder="Search name, phone, email or ticket ID" />
          <select aria-label="Ticket type" className="input h-10 w-auto" value={type} onChange={(e) => { setType(e.target.value); p.setPage(0); }}><option value="">All ticket types</option>{s.ticketTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select aria-label="Payment status" className="input h-10 w-auto" value={pay} onChange={(e) => { setPay(e.target.value); p.setPage(0); }}><option value="">All payments</option>{["PAID", "PENDING", "FAILED", "REFUNDED"].map((x) => <option key={x} value={x}>{x[0] + x.slice(1).toLowerCase()}</option>)}</select>
          <select aria-label="Check-in status" className="input h-10 w-auto" value={arrival} onChange={(e) => { setArrival(e.target.value); p.setPage(0); }}><option value="">All arrivals</option><option value="CHECKED_IN">Checked in</option><option value="NOT_ARRIVED">Not arrived</option></select>
          {filtered && <Button variant="ghost" size="sm" onClick={() => { setQ(""); setType(""); setPay(""); setArrival(""); }}>Clear</Button>}
        </div>
        {rows.length === 0 ? <EmptyState icon={Users} title="No attendees match" body={filtered ? "Adjust the search or filters." : "Attendees appear here once tickets are sold."} /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Ticket</th><th>Ticket Type</th><th>Payment</th><th>Check-In</th><th className="num">Purchased</th><th className="num">Actions</th></tr></thead>
              <tbody>
                {p.slice.map((r) => { const valid = r.payment.status === "PAID" && (r.ticket.status === "ACTIVE" || r.ticket.status === "USED"); return (
                  <tr key={r.ticket.id}>
                    <td className="max-w-[180px] truncate font-medium">{r.attendee.name}</td>
                    <td className="tabular-nums text-fg-muted">{r.attendee.phone}</td>
                    <td className="max-w-[200px] truncate text-fg-muted">{r.attendee.email}</td>
                    <td className="ticket-id">{r.ticket.id}</td>
                    <td><span className="flex items-center gap-2"><span className="h-2 w-2 shrink-0" style={{ background: TYPE_COLOR[r.type.id] }} />{r.type.shortName}</span></td>
                    <td><PaymentBadge status={r.payment.status} /></td>
                    <td>{r.ticket.status === "SUSPENDED" ? <Badge tone="danger">Suspended</Badge> : r.checkIn === "CHECKED_IN" ? <Badge tone="ok" dot>Checked in</Badge> : r.checkIn === "NOT_ARRIVED" ? <Badge>Not arrived</Badge> : <span className="text-fg-dim">—</span>}</td>
                    <td className="num text-fg-muted">{dateTime(r.ticket.createdAt)}</td>
                    <td className="num">
                      <span className="inline-flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`View or edit ${r.attendee.name}`} title="View / edit" onClick={() => openTicket(r.ticket.id)}><Eye className="h-4 w-4" /></Button>
                        {can("tickets.send") && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Resend ticket ${r.ticket.id}`} title="Resend ticket" disabled={!valid} onClick={() => openSend(r.ticket.id)}><Send className="h-4 w-4" /></Button>}
                        {can("payments.refund") && <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-danger" aria-label={`Refund ${r.ticket.id}`} title="Refund" disabled={r.payment.status !== "PAID" || r.ticket.status === "USED"} onClick={() => refund(r)}><Undo2 className="h-4 w-4" /></Button>}
                      </span>
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </TableWrap>
        )}
        <Pager p={p} noun="attendees" />
      </Panel>
    </div>
  );
}

export default function AttendeesPage() {
  return <Suspense><Attendees /></Suspense>;
}
