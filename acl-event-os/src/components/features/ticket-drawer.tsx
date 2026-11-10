"use client";

import { Ban, CheckCircle2, Download, Pencil, RotateCcw, Send, ShieldAlert, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { dateTime, METHOD_LABEL, naira, REASON_LABEL } from "@/lib/format";
import { attendeeSchema } from "@/lib/schemas";
import { useOps } from "../ops-provider";
import { Badge, Button, Drawer, EmptyState, Field, KeyValue, PaymentBadge, ScanBadge, TicketBadge, useConfirm } from "../ui";
import { useUi } from "../ui-context";
import { downloadETicket, ETicket } from "./eticket";

/** Everything known about one ticket: holder, payment, QR and its full scan history. */
export function TicketDrawer({ ticketId, onClose }: { ticketId: string | null; onClose: () => void }) {
  const { s, ix, call, can } = useOps();
  const confirm = useConfirm();
  const { openSend } = useUi();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const ticket = ticketId ? ix.ticket.get(ticketId) : undefined;
  useEffect(() => { setEditing(false); setErrors({}); }, [ticketId]);

  if (!ticketId) return null;
  if (!ticket) {
    return <Drawer open onClose={onClose} title={ticketId} eyebrow="Ticket"><EmptyState icon={ShieldAlert} title="No such ticket" body="This ID has never been issued for this event." /></Drawer>;
  }
  const type = ix.type.get(ticket.typeId)!;
  const attendee = ix.attendee.get(ticket.attendeeId)!;
  const payment = ix.payment.get(ticket.paymentId)!;
  const seat = ix.seat.get(ticket.seatId ?? "");
  const table = s.tables.find((t) => t.id === ticket.tableId);
  const scans = s.checkIns.filter((c) => c.ticketId === ticket.id).reverse();
  const admissible = payment.status === "PAID" && (ticket.status === "ACTIVE" || ticket.status === "USED");
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  async function refund() {
    const r = await confirm({ title: "Refund this payment?", danger: true, confirmLabel: "Refund", reason: { label: "Reason for refund", placeholder: "e.g. Customer can no longer attend" },
      body: <>This refunds <b className="text-fg">{naira(payment.amount)}</b> to {attendee.name} and permanently invalidates {payment.ticketIds.length > 1 ? `all ${payment.ticketIds.length} tickets on this order` : <span className="ticket-id">{ticket!.id}</span>}. The seat returns to sale. This cannot be undone.</> });
    if (r.ok) await run(() => call("payments.refund", { paymentId: payment.id, reason: r.reason }), "Refund issued — ticket invalidated");
  }
  async function suspend() {
    const r = await confirm({ title: "Suspend this ticket?", danger: true, confirmLabel: "Suspend", reason: { label: "Reason", placeholder: "e.g. Reported stolen" }, body: <>A suspended ticket is rejected at every gate until it is reinstated.</> });
    if (r.ok) await run(() => call("tickets.suspend", { ticketId: ticket!.id, reason: r.reason }), "Ticket suspended");
  }
  async function saveAttendee(e: React.FormEvent) {
    e.preventDefault();
    const parsed = attendeeSchema.safeParse({ attendeeId: attendee.id, ...form });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({});
    await run(() => call("attendees.update", parsed.data), "Attendee updated");
    setEditing(false);
  }

  return (
    <Drawer open onClose={onClose} eyebrow={`${type.name} · ${naira(ticket.pricePaid)}`} title={<span className="font-mono text-xl normal-case tracking-tight">{ticket.id}</span>}
      footer={<>
        {admissible && can("tickets.send") && <Button variant="primary" size="sm" onClick={() => openSend(ticket.id)}><Send className="h-3.5 w-3.5" />Resend ticket</Button>}
        {admissible && <Button size="sm" onClick={() => downloadETicket({ ticket, type, attendee, event: s.event, seatLabel: seat?.label }).catch((e) => toast.error(e.message))}><Download className="h-3.5 w-3.5" />Download</Button>}
        {payment.status === "PENDING" && can("payments.manage") && <Button variant="success" size="sm" loading={busy} onClick={() => run(() => call("payments.confirm", { paymentId: payment.id }), "Payment confirmed")}><CheckCircle2 className="h-3.5 w-3.5" />Confirm payment</Button>}
        {ticket.status === "ACTIVE" && payment.status === "PAID" && can("tickets.manage") && <Button size="sm" onClick={suspend}><Ban className="h-3.5 w-3.5" />Suspend</Button>}
        {ticket.status === "SUSPENDED" && can("tickets.manage") && <Button size="sm" loading={busy} onClick={() => run(() => call("tickets.reinstate", { ticketId: ticket.id }), "Ticket reinstated")}><RotateCcw className="h-3.5 w-3.5" />Reinstate</Button>}
        {payment.status === "PAID" && ticket.status !== "USED" && can("payments.refund") && <Button variant="danger" size="sm" onClick={refund}><Undo2 className="h-3.5 w-3.5" />Refund</Button>}
      </>}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <PaymentBadge status={payment.status} />
          <TicketBadge status={ticket.status} />
          {ticket.agentId && <Badge>Agent {ticket.agentId}</Badge>}
          {ticket.promoCode && <Badge tone="gold">{ticket.promoCode}</Badge>}
        </div>
        {ticket.status === "SUSPENDED" && <p className="border border-danger/50 bg-danger/10 p-3 text-sm text-danger">{ticket.suspendedReason}</p>}

        {admissible ? <ETicket ticket={ticket} type={type} attendee={attendee} event={s.event} seatLabel={seat?.label} />
          : <p className="border border-ink-500 bg-ink-900 p-3 text-sm text-fg-muted">No scannable e-ticket: {payment.status === "PENDING" ? "payment has not been confirmed." : payment.status === "FAILED" ? "payment failed." : ticket.status === "SUSPENDED" ? "ticket is suspended." : "ticket was refunded."}</p>}

        <section>
          <div className="mb-1 flex items-center justify-between"><h3 className="eyebrow">Attendee</h3>
            {can("attendees.edit") && !editing && <Button variant="ghost" size="sm" onClick={() => { setForm({ name: attendee.name, phone: attendee.phone, email: attendee.email }); setEditing(true); }}><Pencil className="h-3.5 w-3.5" />Edit</Button>}
          </div>
          {editing ? (
            <form onSubmit={saveAttendee} noValidate className="space-y-3">
              <Field label="Full name" error={errors.name}>{(p) => <input {...p} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
              <Field label="Phone" error={errors.phone}>{(p) => <input {...p} className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}</Field>
              <Field label="Email" error={errors.email}>{(p) => <input {...p} className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
              <div className="flex gap-2"><Button type="submit" variant="primary" size="sm" loading={busy}>Save</Button><Button size="sm" onClick={() => setEditing(false)}>Cancel</Button></div>
            </form>
          ) : <KeyValue rows={[["Name", attendee.name], ["Phone", attendee.phone], ["Email", attendee.email], [type.isTable ? "Table" : "Seat", seat?.label ?? "—"], ["Purchased", dateTime(ticket.createdAt)]]} />}
          {table && table.guests.length > 0 && <p className="mt-2 text-xs text-fg-dim">Guests: {table.guests.join(", ")}</p>}
        </section>

        <section>
          <h3 className="eyebrow mb-1">Payment</h3>
          <KeyValue rows={[["Transaction", <span key="t" className="ticket-id">{payment.id}</span>], ["Reference", <span key="r" className="ticket-id">{payment.reference}</span>], ["Amount", naira(payment.amount)], ["Method", METHOD_LABEL[payment.method]],
            ...(payment.refundReason ? [["Refund reason", payment.refundReason] as [string, React.ReactNode]] : []), ...(payment.failureReason ? [["Failure", payment.failureReason] as [string, React.ReactNode]] : [])]} />
        </section>

        <section>
          <h3 className="eyebrow mb-2">Scan history · {scans.length}</h3>
          {scans.length === 0 ? <p className="text-sm text-fg-dim">This ticket has not been presented at a gate.</p> : (
            <ol className="space-y-2">
              {scans.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 border border-ink-600 bg-ink-900 p-2.5 text-sm">
                  <div className="min-w-0"><div className="flex items-center gap-2"><ScanBadge result={c.result} reason={c.reason} /><span className="truncate">{REASON_LABEL[c.reason]}</span></div>
                    <div className="mt-1 truncate text-xs text-fg-dim">{ix.gate.get(c.gateId)?.name} · {ix.user.get(c.operatorId)?.name} · {c.deviceId}</div></div>
                  <time className="shrink-0 text-xs tabular-nums text-fg-muted">{dateTime(c.at)}</time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Drawer>
  );
}
