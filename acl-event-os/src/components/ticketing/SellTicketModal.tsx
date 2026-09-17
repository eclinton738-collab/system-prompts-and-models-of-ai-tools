"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { QrCode } from "@/components/checkin/QrCode";
import { useAcl } from "@/lib/client/provider";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { purchaseSchema } from "@/lib/domain/schemas";
import { TICKET_TYPES, TICKET_TYPE_LIST } from "@/lib/domain/catalog";
import { formatNaira } from "@/lib/domain/format";
import { buildETicketHtml, downloadFile, printHtml } from "@/lib/client/eticket";
import { Download, Send, Printer, CheckCircle2 } from "lucide-react";
import type { AgentPerformance } from "@/lib/domain/stats";
import type { PaymentMethod, Ticket, TicketTypeCode, Payment } from "@/lib/domain/types";

const METHODS: Array<[PaymentMethod, string]> = [
  ["CARD", "Card"],
  ["BANK_TRANSFER", "Bank Transfer"],
  ["USSD", "USSD"],
  ["POS_AGENT", "POS / Agent"],
  ["CASH_OUTLET", "Cash Outlet"],
];

interface SaleResult {
  payment: Payment;
  tickets: Array<Ticket & { qr?: string }>;
  typeName: string;
}

export function SellTicketModal({
  open,
  onClose,
  initialType,
}: {
  open: boolean;
  onClose: () => void;
  initialType?: TicketTypeCode;
}) {
  const { state, refresh } = useAcl();
  const toast = useToast();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    type: (initialType ?? "GENERAL") as TicketTypeCode,
    quantity: 1,
    method: "CARD" as PaymentMethod,
    agentId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);
  const [agents, setAgents] = useState<AgentPerformance[]>([]);

  useEffect(() => {
    if (initialType) setForm((f) => ({ ...f, type: initialType }));
  }, [initialType]);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setErrors({});
    apiGet<AgentPerformance[]>("/api/agents")
      .then(setAgents)
      .catch(() => setAgents([]));
  }, [open]);

  const def = TICKET_TYPES[form.type];
  const remaining = useMemo(
    () => state?.breakdown.find((b) => b.type === form.type)?.remaining ?? 0,
    [state?.breakdown, form.type],
  );
  const total = def.price * Math.max(1, form.quantity);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = purchaseSchema.safeParse({
      ...form,
      agentId: form.method === "POS_AGENT" ? form.agentId || undefined : undefined,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }
    if (form.method === "POS_AGENT" && !form.agentId) {
      setErrors({ agentId: "Choose the agent making this sale." });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const sale = await apiSend<SaleResult>("/api/tickets", parsed.data);
      setResult(sale);
      await refresh();
      toast.push({
        tone: "success",
        title: "Ticket issued",
        body: `${sale.tickets.length} × ${sale.typeName} — ${formatNaira(sale.payment.amount)}`,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields ?? {});
        toast.push({ tone: "error", title: "Sale failed", body: err.message });
      }
    } finally {
      setBusy(false);
    }
  }

  async function withETicket(ticket: Ticket & { qr?: string }, action: "download" | "print") {
    if (!ticket.qr || !state?.event) return;
    const html = await buildETicketHtml(ticket, ticket.qr, state.event);
    if (action === "download") downloadFile(`${ticket.id}.html`, html);
    else printHtml(html);
  }

  async function sendETicket(ticketId: string) {
    try {
      const { to } = await apiSend<{ to: string }>(`/api/tickets/${ticketId}/resend`, { via: "EMAIL" });
      toast.push({ tone: "success", title: "E-ticket sent", body: `Delivered to ${to}.` });
      await refresh();
    } catch (err) {
      toast.push({ tone: "error", title: "Could not send", body: err instanceof Error ? err.message : "" });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={result ? "Ticket issued" : "Sell ticket"}
      subtitle={result ? "Payment captured and entry credentials generated." : "Issue a ticket and generate its QR credential."}
      size={result ? "md" : "lg"}
      footer={
        result ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={busy} disabled={remaining <= 0}>
              Charge {formatNaira(total)}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[3px] border border-ok/45 bg-ok/[0.08] px-3.5 py-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
            <div>
              <p className="font-display text-[13px] font-extrabold uppercase tracking-[0.06em] text-ok">
                Payment {result.payment.status === "PAID" ? "captured" : "pending"}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-2">
                {result.payment.reference} · {formatNaira(result.payment.amount)} via{" "}
                {METHODS.find(([m]) => m === result.payment.method)?.[1]}
              </p>
            </div>
          </div>

          {result.tickets.map((ticket) => (
            <div key={ticket.id} className="acl-inset flex flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:items-start">
              <QrCode token={ticket.qr} size={150} label={ticket.id} />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="font-display text-[15px] font-extrabold uppercase text-ink">{ticket.attendeeName}</p>
                  <p className="text-[12px] text-ink-3">
                    {TICKET_TYPES[ticket.type].name} — {formatNaira(ticket.price)}
                  </p>
                </div>
                <Badge tone="ok" dot>
                  {ticket.paymentStatus}
                </Badge>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button size="sm" variant="outline" onClick={() => withETicket(ticket, "download")}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => withETicket(ticket, "print")}>
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => sendETicket(ticket.id)}>
                    <Send className="h-3.5 w-3.5" />
                    Send e-ticket
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <p className="text-[11px] leading-relaxed text-ink-4">
            Each QR carries a signed, single-use credential. It is validated against the server record at the
            gate — a screenshot or copy is refused.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="acl-label mb-2">Ticket type</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TICKET_TYPE_LIST.map((tier) => {
                const left = state?.breakdown.find((b) => b.type === tier.code)?.remaining ?? 0;
                const active = form.type === tier.code;
                return (
                  <button
                    key={tier.code}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: tier.code, quantity: 1 }))}
                    disabled={left <= 0}
                    className={`rounded-[3px] border px-2.5 py-2 text-left transition-colors disabled:opacity-40 ${
                      active ? "border-acl-red bg-acl-red/10" : "border-hairline-strong bg-surface-2 hover:border-acl-red/50"
                    }`}
                  >
                    <span className={`block font-display text-[11px] font-extrabold uppercase tracking-[0.06em] ${tier.premium ? "text-gold" : "text-ink"}`}>
                      {tier.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-[12px] text-ink-2">{formatNaira(tier.price)}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-4">{left} left</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" required error={errors.fullName}>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Chidi Okafor"
                invalid={Boolean(errors.fullName)}
                autoComplete="name"
              />
            </Field>
            <Field label="Phone" required error={errors.phone} hint={errors.phone ? undefined : "Nigerian number"}>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="0803 123 4567"
                inputMode="tel"
                invalid={Boolean(errors.phone)}
                autoComplete="tel"
              />
            </Field>
            <Field label="Email" required error={errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="chidi@example.com"
                invalid={Boolean(errors.email)}
                autoComplete="email"
              />
            </Field>
            <Field label="Quantity" required error={errors.quantity} hint={`${remaining} available`}>
              <Input
                type="number"
                min={1}
                max={Math.max(1, remaining)}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                invalid={Boolean(errors.quantity)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Payment method" required error={errors.method}>
              <Select
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}
              >
                {METHODS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            {form.method === "POS_AGENT" ? (
              <Field label="Selling agent" required error={errors.agentId}>
                <Select
                  value={form.agentId}
                  onChange={(e) => setForm((f) => ({ ...f, agentId: e.target.value }))}
                  invalid={Boolean(errors.agentId)}
                >
                  <option value="">Select agent…</option>
                  {agents
                    .filter((a) => a.agent.status === "ACTIVE")
                    .map((a) => (
                      <option key={a.agent.id} value={a.agent.id}>
                        {a.agent.id} — {a.agent.name} ({a.agent.location})
                      </option>
                    ))}
                </Select>
              </Field>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-[3px] border border-hairline-strong bg-surface-2 px-3.5 py-3">
            <div>
              <p className="acl-label !text-[9px]">Total due</p>
              <p className="acl-stat text-[22px] text-ink">{formatNaira(total)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-ink-3">
                {form.quantity} × {def.name}
              </p>
              {form.method === "BANK_TRANSFER" || form.method === "CASH_OUTLET" ? (
                <Badge tone="warn" className="mt-1">
                  Settles as pending
                </Badge>
              ) : (
                <Badge tone="ok" className="mt-1">
                  Settles immediately
                </Badge>
              )}
            </div>
          </div>

          {remaining <= 0 ? (
            <p className="rounded-[3px] border border-warn/40 bg-warn/10 px-3 py-2 text-[12px] text-warn">
              {def.name} is sold out. Choose another tier or release held inventory in Seating.
            </p>
          ) : null}
        </form>
      )}
    </Modal>
  );
}
