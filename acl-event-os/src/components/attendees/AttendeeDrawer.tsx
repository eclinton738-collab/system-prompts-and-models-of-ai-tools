"use client";

import { useEffect, useState } from "react";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Badge, PaymentBadge, TicketStatusBadge, ResultBadge } from "@/components/ui/Badge";
import { QrCode } from "@/components/checkin/QrCode";
import { Skeleton } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useAcl } from "@/lib/client/provider";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { attendeeUpdateSchema } from "@/lib/domain/schemas";
import { TICKET_TYPES } from "@/lib/domain/catalog";
import { formatNaira, formatDateTime } from "@/lib/domain/format";
import { buildETicketHtml, downloadFile } from "@/lib/client/eticket";
import { Download, Pencil, RotateCcw, Send, ShieldOff } from "lucide-react";
import type { Attendee, CheckIn, Payment, Ticket } from "@/lib/domain/types";

interface Detail {
  ticket: Ticket;
  attendee: Attendee | null;
  payment: Payment | null;
  history: CheckIn[];
  qr?: string;
}

/** Full attendee record: ticket, credential, payment and gate history. */
export function AttendeeDrawer({ ticketId, onClose }: { ticketId: string | null; onClose: () => void }) {
  const { refresh, allows, state } = useAcl();
  const toast = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | "refund" | "suspend">(null);
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    if (!ticketId) {
      setDetail(null);
      return;
    }
    setDetail(null);
    setEditing(false);
    setErrors({});
    apiGet<Detail>(`/api/tickets/${ticketId}`)
      .then((d) => {
        setDetail(d);
        setForm({ name: d.attendee?.name ?? "", phone: d.attendee?.phone ?? "", email: d.attendee?.email ?? "" });
      })
      .catch((err) => toast.push({ tone: "error", title: "Could not load", body: err.message }));
  }, [ticketId, toast]);

  async function reload() {
    if (!ticketId) return;
    const d = await apiGet<Detail>(`/api/tickets/${ticketId}`);
    setDetail(d);
    await refresh();
  }

  async function saveEdits() {
    const parsed = attendeeUpdateSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }
    if (!detail?.attendee) return;
    setBusy(true);
    try {
      await apiSend(`/api/attendees/${detail.attendee.id}`, parsed.data, "PATCH");
      toast.push({ tone: "success", title: "Attendee updated" });
      setEditing(false);
      setErrors({});
      await reload();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields ?? {});
      toast.push({ tone: "error", title: "Update failed", body: err instanceof Error ? err.message : "" });
    } finally {
      setBusy(false);
    }
  }

  async function doRefund() {
    if (!detail) return;
    setBusy(true);
    try {
      await apiSend(`/api/tickets/${detail.ticket.id}/refund`, { reason: refundReason });
      toast.push({ tone: "success", title: "Refund processed", body: `${detail.ticket.id} refunded.` });
      setConfirm(null);
      setRefundReason("");
      await reload();
    } catch (err) {
      toast.push({ tone: "error", title: "Refund failed", body: err instanceof Error ? err.message : "" });
    } finally {
      setBusy(false);
    }
  }

  async function doSuspend() {
    if (!detail) return;
    setBusy(true);
    try {
      await apiSend(`/api/tickets/${detail.ticket.id}/suspend`, { note: "Flagged from attendee record" });
      toast.push({ tone: "security", title: "Ticket status changed" });
      setConfirm(null);
      await reload();
    } catch (err) {
      toast.push({ tone: "error", title: "Could not change status", body: err instanceof Error ? err.message : "" });
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!detail) return;
    try {
      const { to } = await apiSend<{ to: string }>(`/api/tickets/${detail.ticket.id}/resend`, { via: "EMAIL" });
      toast.push({ tone: "success", title: "E-ticket sent", body: `Delivered to ${to}.` });
      await refresh();
    } catch (err) {
      toast.push({ tone: "error", title: "Could not send", body: err instanceof Error ? err.message : "" });
    }
  }

  async function download() {
    if (!detail?.qr || !state?.event) return;
    const html = await buildETicketHtml(detail.ticket, detail.qr, state.event);
    downloadFile(`${detail.ticket.id}.html`, html);
  }

  const def = detail ? TICKET_TYPES[detail.ticket.type] : null;

  return (
    <>
      <Modal
        open={Boolean(ticketId)}
        onClose={onClose}
        title={detail?.ticket.attendeeName ?? "Attendee"}
        subtitle={ticketId ?? undefined}
        size="lg"
        footer={
          detail ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {allows("attendees.edit") ? (
                  <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {editing ? "Cancel edit" : "Edit"}
                  </Button>
                ) : null}
                {allows("attendees.resend_ticket") ? (
                  <Button size="sm" variant="outline" onClick={resend}>
                    <Send className="h-3.5 w-3.5" />
                    Resend
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={download}>
                  <Download className="h-3.5 w-3.5" />
                  E-ticket
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allows("checkin.override") && detail.ticket.status !== "USED" ? (
                  <Button size="sm" variant="outline" onClick={() => setConfirm("suspend")}>
                    <ShieldOff className="h-3.5 w-3.5" />
                    {detail.ticket.status === "SUSPENDED" ? "Reinstate" : "Suspend"}
                  </Button>
                ) : null}
                {allows("payments.refund") && detail.ticket.paymentStatus === "PAID" && detail.ticket.status !== "USED" ? (
                  <Button size="sm" variant="danger" onClick={() => setConfirm("refund")}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Refund
                  </Button>
                ) : null}
                {editing ? (
                  <Button size="sm" variant="primary" onClick={saveEdits} loading={busy}>
                    Save changes
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        {!detail ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <QrCode token={detail.qr} size={140} label={detail.ticket.id} />
              <div className="min-w-0 flex-1 space-y-3">
                {editing ? (
                  <div className="space-y-2.5">
                    <Field label="Name" required error={errors.name}>
                      <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} invalid={Boolean(errors.name)} />
                    </Field>
                    <Field label="Phone" required error={errors.phone}>
                      <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} invalid={Boolean(errors.phone)} />
                    </Field>
                    <Field label="Email" required error={errors.email}>
                      <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} invalid={Boolean(errors.email)} />
                    </Field>
                  </div>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <Row label="Ticket type" value={`${def?.name} — ${formatNaira(detail.ticket.price)}`} />
                    <Row label="Phone" value={detail.attendee?.phone ?? "—"} mono />
                    <Row label="Email" value={detail.attendee?.email ?? "—"} />
                    <Row label="Purchased" value={formatDateTime(detail.ticket.purchasedAt)} />
                    <Row label="Channel" value={detail.ticket.channel.replace(/_/g, " ")} />
                    <Row label="Agent" value={detail.ticket.agentId ?? "Direct"} />
                  </dl>
                )}

                <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3">
                  <PaymentBadge status={detail.ticket.paymentStatus} />
                  <TicketStatusBadge status={detail.ticket.status} />
                  {detail.ticket.usedAt ? (
                    <Badge tone="ok">Admitted {formatDateTime(detail.ticket.usedAt)}</Badge>
                  ) : (
                    <Badge tone="neutral">Not yet checked in</Badge>
                  )}
                </div>
              </div>
            </div>

            {detail.payment ? (
              <div className="acl-inset p-3">
                <p className="acl-label mb-2 !text-[9px]">Payment</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  <Row label="Transaction" value={detail.payment.id} mono />
                  <Row label="Reference" value={detail.payment.reference} mono />
                  <Row label="Method" value={detail.payment.method.replace(/_/g, " ")} />
                  <Row label="Amount" value={formatNaira(detail.payment.amount)} mono />
                </dl>
                {detail.payment.failureReason ? (
                  <p className="mt-2 text-[11.5px] text-danger">Failure: {detail.payment.failureReason}</p>
                ) : null}
              </div>
            ) : null}

            <div>
              <p className="acl-label mb-2 !text-[9px]">Gate history</p>
              {detail.history.length === 0 ? (
                <p className="rounded-[3px] border border-hairline bg-surface-2 px-3 py-3 text-[12px] text-ink-3">
                  This ticket has never been presented at a gate.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.history.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-hairline bg-surface-2 px-3 py-2">
                      <ResultBadge result={h.result} />
                      <span className="text-[12px] text-ink-2">{h.gateName}</span>
                      <span className="text-[11.5px] text-ink-4">{h.operatorName}</span>
                      {h.reason ? <Badge tone="danger">{h.reason.replace(/_/g, " ")}</Badge> : null}
                      <span className="ml-auto font-mono text-[11px] text-ink-3">{formatDateTime(h.scannedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm === "refund"}
        onClose={() => setConfirm(null)}
        onConfirm={doRefund}
        title="Refund this ticket?"
        body="The ticket becomes non-admissible immediately and the revenue is removed from the event totals. This cannot be undone."
        confirmLabel="Refund ticket"
        loading={busy}
      >
        <div className="mt-3">
          <Field label="Reason" required>
            <Textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Customer requested cancellation…"
            />
          </Field>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "suspend"}
        onClose={() => setConfirm(null)}
        onConfirm={doSuspend}
        title={detail?.ticket.status === "SUSPENDED" ? "Reinstate this ticket?" : "Suspend this ticket?"}
        body={
          detail?.ticket.status === "SUSPENDED"
            ? "The holder will be admitted normally at the gate again."
            : "The holder will be refused at every gate until the suspension is lifted. Use this for suspected resale fraud."
        }
        confirmLabel={detail?.ticket.status === "SUSPENDED" ? "Reinstate" : "Suspend"}
        loading={busy}
      />
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="acl-label !text-[8.5px]">{label}</dt>
      <dd className={`mt-0.5 truncate text-[12.5px] text-ink ${mono ? "font-mono text-[12px]" : ""}`}>{value}</dd>
    </div>
  );
}
