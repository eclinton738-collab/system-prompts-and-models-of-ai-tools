"use client";

import { CheckCircle2, CreditCard, Download, Undo2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOps } from "@/components/ops-provider";
import { Button, Drawer, EmptyState, KeyValue, PageHeader, Pager, Panel, PaymentBadge, SearchInput, TableWrap, Tabs, TicketBadge, useConfirm, usePaged } from "@/components/ui";
import { useUi } from "@/components/ui-context";
import { downloadCsv } from "@/lib/csv";
import { dateTime, METHOD_LABEL, naira } from "@/lib/format";
import { byStatus, METHODS } from "@/lib/metrics";
import type { PaymentStatus } from "@/lib/types";

export default function PaymentsPage() {
  const { s, ix, can, call } = useOps();
  const { openTicket } = useUi();
  const confirm = useConfirm();
  const [status, setStatus] = useState<"ALL" | PaymentStatus>("ALL");
  const [method, setMethod] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const totals = useMemo(() => byStatus(s), [s]);
  const all = useMemo(() => [...s.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [s.payments]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return all.filter((p) => (status === "ALL" || p.status === status) && (!method || p.method === method) &&
      (!n || p.id.toLowerCase().includes(n) || p.reference.toLowerCase().includes(n) || p.ticketIds.some((t) => t.toLowerCase().includes(n)) || !!ix.attendee.get(p.attendeeId)?.name.toLowerCase().includes(n)));
  }, [all, status, method, q, ix]);
  const pg = usePaged(rows, 14);
  const open = openId ? ix.payment.get(openId) : undefined;
  const customer = open && ix.attendee.get(open.attendeeId);
  const openTickets = open ? open.ticketIds.map((id) => ix.ticket.get(id)).filter((t) => !!t) : [];
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast.success(ok); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };

  async function refund() {
    if (!open) return;
    const r = await confirm({ title: "Refund this payment?", danger: true, confirmLabel: "Refund", reason: { label: "Reason for refund" }, body: <>Refund <b className="text-fg">{naira(open.amount)}</b> to {customer?.name}. {open.ticketIds.length} ticket{open.ticketIds.length > 1 ? "s" : ""} will be invalidated and the inventory returned to sale. This cannot be undone.</> });
    if (r.ok) await run(() => call("payments.refund", { paymentId: open.id, reason: r.reason }), "Refund issued");
  }
  async function markFailed() {
    if (!open) return;
    const r = await confirm({ title: "Mark payment as failed?", danger: true, confirmLabel: "Mark failed", reason: { label: "Reason", placeholder: "e.g. Transfer never arrived" }, body: <>The order is cancelled, its ticket is voided and the seat is released.</> });
    if (r.ok) await run(() => call("payments.fail", { paymentId: open.id, reason: r.reason }), "Payment marked failed");
  }

  return (
    <div>
      <PageHeader title="Payments" subtitle="Every transaction against this event. Payment status — not the QR code — decides whether a ticket is valid.">
        <Button disabled={rows.length === 0} onClick={() => downloadCsv("acl-payments", ["Transaction ID", "Ticket ID(s)", "Customer", "Amount (NGN)", "Method", "Status", "Date", "Reference", "Agent"], rows.map((p) => [p.id, p.ticketIds.join(" "), ix.attendee.get(p.attendeeId)?.name ?? "", p.amount, METHOD_LABEL[p.method], p.status, dateTime(p.createdAt), p.reference, p.agentId ?? ""]))}><Download className="h-4 w-4" />Export</Button>
      </PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {totals.map((t) => <button key={t.status} type="button" onClick={() => { setStatus(t.status); pg.setPage(0); }} className="panel p-4 text-left transition hover:border-fg-dim"><PaymentBadge status={t.status} /><div className="mt-2 truncate text-2xl font-semibold tabular-nums">{naira(t.amount)}</div><div className="mt-1 text-xs text-fg-dim">{t.count} transaction{t.count === 1 ? "" : "s"}</div></button>)}
      </div>
      {s.demo && <p className="mb-4 border border-info/40 bg-info/10 px-3 py-2 text-xs text-info">Demo gateway: no real money moves. Card, POS and cash sales settle instantly; bank transfer and USSD wait for Finance to confirm. A live provider plugs in at <code className="font-mono">src/server/payments.ts</code>.</p>}
      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-600 p-3">
          <Tabs label="Payment status" value={status} onChange={(v) => { setStatus(v); pg.setPage(0); }} options={[{ value: "ALL", label: "All", count: all.length }, ...totals.map((t) => ({ value: t.status, label: t.status[0] + t.status.slice(1).toLowerCase(), count: t.count }))]} />
          <select aria-label="Payment method" className="input h-9 w-auto" value={method} onChange={(e) => { setMethod(e.target.value); pg.setPage(0); }}><option value="">All methods</option>{METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select>
          <SearchInput className="min-w-[220px] flex-1" value={q} onChange={(v) => { setQ(v); pg.setPage(0); }} placeholder="Search transaction, reference, ticket or customer" />
        </div>
        {rows.length === 0 ? <EmptyState icon={CreditCard} title="No payments match" body="Change the status filter or search." action={<Button onClick={() => { setStatus("ALL"); setMethod(""); setQ(""); }}>Clear filters</Button>} /> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Transaction ID</th><th>Ticket ID</th><th>Customer</th><th className="num">Amount</th><th>Method</th><th>Status</th><th className="num">Date</th><th>Reference</th></tr></thead>
              <tbody>
                {pg.slice.map((p) => (
                  <tr key={p.id} className="cursor-pointer" tabIndex={0} role="button" aria-label={`Open payment ${p.id}`} onClick={() => setOpenId(p.id)} onKeyDown={(e) => { if (e.key === "Enter") setOpenId(p.id); }}>
                    <td className="ticket-id">{p.id}</td>
                    <td className="ticket-id text-fg-muted">{p.ticketIds[0]}{p.ticketIds.length > 1 && <span className="ml-1 font-sans text-fg-dim">+{p.ticketIds.length - 1}</span>}</td>
                    <td className="max-w-[180px] truncate">{ix.attendee.get(p.attendeeId)?.name}</td>
                    <td className="num font-medium">{naira(p.amount)}</td>
                    <td className="text-fg-muted">{METHOD_LABEL[p.method]}</td>
                    <td><PaymentBadge status={p.status} /></td>
                    <td className="num text-fg-muted">{dateTime(p.createdAt)}</td>
                    <td className="font-mono text-xs text-fg-dim">{p.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
        <Pager p={pg} noun="payments" />
      </Panel>

      <Drawer open={!!open} onClose={() => setOpenId(null)} eyebrow="Payment details" title={<span className="font-mono text-xl normal-case tracking-tight">{open?.id}</span>}
        footer={open && <>
          {open.status === "PENDING" && can("payments.manage") && <Button variant="success" size="sm" loading={busy} onClick={() => run(() => call("payments.confirm", { paymentId: open.id }), "Payment confirmed — ticket is now valid")}><CheckCircle2 className="h-3.5 w-3.5" />Confirm received</Button>}
          {open.status === "PENDING" && can("payments.manage") && <Button variant="danger" size="sm" onClick={markFailed}><XCircle className="h-3.5 w-3.5" />Mark failed</Button>}
          {open.status === "PAID" && can("payments.refund") && <Button variant="danger" size="sm" disabled={openTickets.some((t) => t!.status === "USED")} title={openTickets.some((t) => t!.status === "USED") ? "A ticket on this payment has been used" : undefined} onClick={refund}><Undo2 className="h-3.5 w-3.5" />Refund</Button>}
        </>}>
        {open && (
          <div className="space-y-6">
            <div className="flex items-end justify-between gap-3"><div><div className="eyebrow">Amount</div><div className="text-4xl font-semibold tabular-nums">{naira(open.amount)}</div></div><PaymentBadge status={open.status} /></div>
            <section><h3 className="eyebrow mb-1">Transaction</h3>
              <KeyValue rows={[["Reference", <span key="r" className="ticket-id">{open.reference}</span>], ["Method", METHOD_LABEL[open.method]], ["Provider", open.provider], ["Created", dateTime(open.createdAt)],
                ...(open.paidAt ? [["Paid", dateTime(open.paidAt)] as [string, React.ReactNode]] : []), ...(open.agentId ? [["Agent", `${open.agentId} · ${ix.agent.get(open.agentId)?.name ?? ""}`] as [string, React.ReactNode]] : []),
                ...(open.refundedAt ? [["Refunded", dateTime(open.refundedAt)] as [string, React.ReactNode], ["Refund reason", open.refundReason ?? "—"] as [string, React.ReactNode]] : []), ...(open.failureReason ? [["Failure reason", open.failureReason] as [string, React.ReactNode]] : [])]} />
            </section>
            <section><h3 className="eyebrow mb-1">Customer</h3><KeyValue rows={[["Name", customer?.name], ["Phone", customer?.phone], ["Email", customer?.email]]} /></section>
            <section><h3 className="eyebrow mb-2">Tickets · {openTickets.length}</h3>
              <ul className="space-y-2">{openTickets.map((t) => <li key={t!.id}><button type="button" onClick={() => { setOpenId(null); openTicket(t!.id); }} className="flex w-full items-center justify-between gap-3 border border-ink-600 bg-ink-900 p-3 text-left hover:border-fg-dim"><span><span className="ticket-id block">{t!.id}</span><span className="text-xs text-fg-dim">{ix.type.get(t!.typeId)?.name} · {naira(t!.pricePaid)}</span></span><TicketBadge status={t!.status} /></button></li>)}</ul>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
