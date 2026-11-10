"use client";

import { Banknote, Building2, CheckCircle2, Clock, CreditCard, Download, Hash, Send, Store, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { METHOD_LABEL, naira } from "@/lib/format";
import { byType } from "@/lib/metrics";
import { purchaseSchema } from "@/lib/schemas";
import type { Attendee, Payment, PaymentMethod, Ticket, TicketTypeId } from "@/lib/types";
import { useOps } from "../ops-provider";
import { Button, Field, Modal } from "../ui";
import type { SellMode } from "../ui-context";
import { downloadETicket, ETicket } from "./eticket";

const METHOD_ICON: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = { CARD: CreditCard, BANK_TRANSFER: Building2, USSD: Hash, POS_AGENT: Store, CASH_OUTLET: Banknote };
const METHOD_ORDER: PaymentMethod[] = ["CARD", "BANK_TRANSFER", "USSD", "POS_AGENT", "CASH_OUTLET"];
const TITLE: Record<SellMode, string> = { sell: "Sell Ticket", attendee: "Add Attendee", table: "Create Table Booking" };

interface Result { payment: Payment; tickets: Ticket[]; attendee: Attendee; instructions?: string }

export function SellDialog({ mode, initialTypeId, initialTableId, onClose }: { mode: SellMode; initialTypeId?: TicketTypeId; initialTableId?: string; onClose: () => void }) {
  const { s, ix, call, can } = useOps();
  const me = s.currentUser;
  const stats = useMemo(() => byType(s, ix), [s, ix]);
  const choices = stats.filter((x) => (mode === "table" ? x.type.isTable : true));
  const [typeId, setTypeId] = useState<TicketTypeId>(initialTypeId ?? choices.find((c) => c.available > 0)?.type.id ?? choices[0].type.id);
  const [form, setForm] = useState({ name: "", phone: "", email: "", quantity: "1", promoCode: "", guests: "" });
  const [method, setMethod] = useState<PaymentMethod>(me.agentId ? "POS_AGENT" : "CARD");
  const [agentId, setAgentId] = useState("");
  const [tableId, setTableId] = useState(initialTableId ?? "");
  const [decline, setDecline] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [shown, setShown] = useState(0);

  const stat = stats.find((x) => x.type.id === typeId)!;
  const type = stat.type;
  const quantity = type.isTable ? 1 : Math.max(1, Number(form.quantity) || 1);
  const promo = s.promoCodes.find((p) => p.active && p.code === form.promoCode.trim().toUpperCase());
  const unit = promo ? Math.round(type.price * (1 - promo.percentOff / 100)) : type.price;
  const freeTables = s.tables.filter((t) => t.typeId === typeId && ix.seat.get(t.seatId)?.status === "AVAILABLE");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      typeId, quantity, name: form.name, phone: form.phone, email: form.email, method,
      agentId: method === "POS_AGENT" && !me.agentId ? agentId || undefined : undefined,
      promoCode: form.promoCode.trim() || undefined,
      tableId: type.isTable && tableId ? tableId : undefined,
      guests: type.isTable ? form.guests.split("\n").map((g) => g.trim()).filter(Boolean) : undefined,
      simulateDecline: method === "CARD" && decline,
    };
    const parsed = purchaseSchema.safeParse(input);
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    if (method === "POS_AGENT" && !me.agentId && !agentId) errs.agentId = "Select the selling agent";
    if (quantity > stat.available) errs.quantity = stat.available === 0 ? "Sold out" : `Only ${stat.available} left`;
    if (quantity > s.event.rules.maxPerOrder) errs.quantity = `Maximum ${s.event.rules.maxPerOrder} per order`;
    if (form.promoCode.trim() && !promo) errs.promoCode = "Code not recognised";
    if ((input.guests?.length ?? 0) > type.guestsPerUnit) errs.guests = `This table seats ${type.guestsPerUnit}`;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await call<Result>("tickets.purchase", input);
      setResult(res); setShown(0);
      if (res.payment.status === "PAID") toast.success(`${res.tickets.length > 1 ? `${res.tickets.length} tickets` : res.tickets[0].id} issued`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  async function confirmPayment() {
    if (!result) return;
    setBusy(true);
    try {
      const p = await call<Payment>("payments.confirm", { paymentId: result.payment.id });
      setResult({ ...result, payment: p });
      toast.success("Payment confirmed — ticket is now valid");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  async function send(channel: "EMAIL" | "WHATSAPP") {
    if (!result) return;
    try {
      for (const t of result.tickets) await call("tickets.send", { ticketId: t.id, channel });
      toast.success(`E-ticket${result.tickets.length > 1 ? "s" : ""} queued to ${channel === "EMAIL" ? result.attendee.email : result.attendee.phone}`, { description: s.demo ? "Demo mode: logged to the outbox, not actually sent." : undefined });
    } catch (err) { toast.error((err as Error).message); }
  }

  /* ───────── Result ───────── */
  if (result) {
    const status = result.payment.status;
    // Read the live ticket so a confirmed payment / changed status is reflected.
    const live = result.tickets.map((t) => ix.ticket.get(t.id) ?? t);
    const t = live[shown];
    return (
      <Modal open onClose={onClose} title={status === "PAID" ? "Ticket issued" : status === "PENDING" ? "Awaiting payment" : "Payment failed"} size="lg">
        <div className="grid gap-6 md:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <div className={cn("flex items-start gap-3 border p-4", status === "PAID" ? "border-ok/40 bg-ok/10" : status === "PENDING" ? "border-warn/40 bg-warn/10" : "border-danger/50 bg-danger/10")}>
              {status === "PAID" ? <CheckCircle2 className="h-6 w-6 shrink-0 text-ok" /> : status === "PENDING" ? <Clock className="h-6 w-6 shrink-0 text-warn" /> : <XCircle className="h-6 w-6 shrink-0 text-danger" />}
              <div className="min-w-0 text-sm">
                <p className="h-display text-lg tracking-[0.08em]">{status === "PAID" ? "Payment successful" : status === "PENDING" ? "Payment pending" : "Payment declined"}</p>
                <p className="mt-1 text-fg-muted">
                  {status === "PAID" && `${naira(result.payment.amount)} received via ${METHOD_LABEL[result.payment.method]}. ${live.length > 1 ? `${live.length} tickets are` : "The ticket is"} valid for entry.`}
                  {status === "PENDING" && (result.instructions ?? "Waiting for the payment to be confirmed.")}
                  {status === "FAILED" && `${result.payment.failureReason}. No ticket was issued and the seat was not held.`}
                </p>
                {status === "PENDING" && <p className="mt-2 text-xs text-warn">The ticket exists but will be rejected at the gate until payment is confirmed.</p>}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="eyebrow">Transaction</dt><dd className="ticket-id">{result.payment.id}</dd></div>
              <div><dt className="eyebrow">Reference</dt><dd className="ticket-id">{result.payment.reference}</dd></div>
              <div><dt className="eyebrow">Customer</dt><dd className="truncate">{result.attendee.name}</dd></div>
              <div><dt className="eyebrow">Amount</dt><dd className="tabular-nums">{naira(result.payment.amount)}</dd></div>
            </dl>
            {live.length > 1 && (
              <div>
                <div className="eyebrow mb-1.5">Tickets in this order</div>
                <div className="flex flex-wrap gap-1.5">
                  {live.map((x, i) => <button key={x.id} type="button" onClick={() => setShown(i)} className={cn("ticket-id border px-2 py-1", i === shown ? "border-acl bg-acl/15" : "border-ink-500 hover:border-fg-dim")}>{x.id}</button>)}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {status === "PAID" && (
                <>
                  <Button variant="primary" onClick={() => downloadETicket({ ticket: t, type: ix.type.get(t.typeId)!, attendee: result.attendee, event: s.event, seatLabel: ix.seat.get(t.seatId ?? "")?.label }).catch((e) => toast.error(e.message))}><Download className="h-4 w-4" />Download e-ticket</Button>
                  <Button onClick={() => send("EMAIL")}><Send className="h-4 w-4" />Send by email</Button>
                  <Button onClick={() => send("WHATSAPP")}><Send className="h-4 w-4" />WhatsApp</Button>
                </>
              )}
              {status === "PENDING" && can("payments.manage") && <Button variant="success" loading={busy} onClick={confirmPayment}><CheckCircle2 className="h-4 w-4" />Confirm payment received</Button>}
              {status === "FAILED" && <Button variant="primary" onClick={() => { setResult(null); setDecline(false); }}>Try again</Button>}
              <Button variant="ghost" onClick={() => { setResult(null); setForm({ name: "", phone: "", email: "", quantity: "1", promoCode: "", guests: "" }); setTableId(""); }}>New sale</Button>
            </div>
          </div>
          {status !== "FAILED" && (
            <div className={cn(status === "PENDING" && "opacity-50 grayscale")}>
              <ETicket ticket={t} type={ix.type.get(t.typeId)!} attendee={result.attendee} event={s.event} seatLabel={ix.seat.get(t.seatId ?? "")?.label} />
              {status === "PENDING" && <p className="mt-2 text-center text-xs text-warn">Not valid until paid</p>}
            </div>
          )}
        </div>
      </Modal>
    );
  }

  /* ───────── Checkout form ───────── */
  return (
    <Modal open onClose={onClose} title={TITLE[mode]} description={`${s.event.name} · ${mode === "attendee" ? "Register a guest and issue their ticket." : "Checkout"}`} size="xl" tone={type.tier === "elite" ? "gold" : undefined}>
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <fieldset>
            <legend className="eyebrow mb-2">1 · Ticket</legend>
            <div className={cn("grid gap-2", mode === "table" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
              {choices.map(({ type: t, available }) => (
                <button key={t.id} type="button" disabled={available === 0} aria-pressed={typeId === t.id} onClick={() => { setTypeId(t.id); setTableId(""); }}
                  className={cn("border p-3 text-left transition disabled:opacity-40", typeId === t.id ? (t.tier === "standard" ? "border-acl bg-acl/10" : "border-gold bg-gold/10") : "border-ink-500 bg-ink-900 hover:border-fg-dim")}>
                  <div className={cn("font-display text-sm font-bold uppercase tracking-[0.12em]", t.tier !== "standard" && "text-gold-light")}>{t.name}</div>
                  <div className="mt-0.5 text-lg font-semibold tabular-nums">{naira(t.price)}</div>
                  <div className={cn("text-xs", available === 0 ? "text-danger" : available <= 5 ? "text-warn" : "text-fg-dim")}>{available === 0 ? "Sold out" : `${available} left`}</div>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-2">2 · {type.isTable ? "Buyer" : "Customer"}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={type.isTable ? "Buyer / group name" : "Full name"} error={errors.name} className="sm:col-span-2">{(p) => <input {...p} className="input" autoComplete="off" value={form.name} onChange={set("name")} placeholder={type.isTable ? "Kingsley Group" : "John Doe"} />}</Field>
              <Field label="Phone" error={errors.phone}>{(p) => <input {...p} className="input" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="0803 123 4567" />}</Field>
              <Field label="Email" error={errors.email}>{(p) => <input {...p} className="input" type="email" value={form.email} onChange={set("email")} placeholder="name@example.com" />}</Field>
              {type.isTable ? (
                <>
                  <Field label="Table" hint={`${freeTables.length} available · seats ${type.guestsPerUnit}`} error={errors.tableId}>
                    {(p) => <select {...p} className="input" value={tableId} onChange={(e) => setTableId(e.target.value)}><option value="">Next available</option>{freeTables.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>}
                  </Field>
                  <Field label="Promo code" error={errors.promoCode} hint={promo ? `${promo.percentOff}% off applied` : undefined}>{(p) => <input {...p} className="input uppercase" value={form.promoCode} onChange={set("promoCode")} placeholder="Optional" />}</Field>
                  <Field label="Guest list" hint="One name per line. Can be completed later." error={errors.guests} className="sm:col-span-2">{(p) => <textarea {...p} className="input" rows={3} value={form.guests} onChange={set("guests")} />}</Field>
                </>
              ) : (
                <>
                  <Field label="Ticket quantity" error={errors.quantity} hint={`Max ${Math.min(s.event.rules.maxPerOrder, stat.available)} on this order`}>{(p) => <input {...p} className="input" type="number" min={1} max={s.event.rules.maxPerOrder} value={form.quantity} onChange={set("quantity")} />}</Field>
                  <Field label="Promo code" error={errors.promoCode} hint={promo ? `${promo.percentOff}% off applied` : undefined}>{(p) => <input {...p} className="input uppercase" value={form.promoCode} onChange={set("promoCode")} placeholder="Optional" />}</Field>
                </>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-2">3 · Payment method</legend>
            {me.agentId ? (
              <div className="flex items-center gap-3 border border-ink-500 bg-ink-900 p-3 text-sm"><Store className="h-5 w-5 text-fg-muted" /><span>POS sale credited to <span className="ticket-id">{me.agentId}</span> ({me.name}). Agents cannot sell under another ID.</span></div>
            ) : (
              <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {METHOD_ORDER.map((m) => { const Icon = METHOD_ICON[m]; return (
                  <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={cn("flex flex-col items-center gap-1.5 border px-2 py-3 text-center transition", method === m ? "border-acl bg-acl/10 text-fg" : "border-ink-500 bg-ink-900 text-fg-muted hover:border-fg-dim")}>
                    <Icon className="h-5 w-5" /><span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em]">{m === "POS_AGENT" ? "POS" : m === "CASH_OUTLET" ? "Cash Outlet" : METHOD_LABEL[m]}</span>
                  </button>
                ); })}
              </div>
            )}
            {method === "POS_AGENT" && !me.agentId && (
              <Field label="Selling agent" error={errors.agentId} className="mt-3">{(p) => <select {...p} className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}><option value="">Select agent…</option>{s.agents.filter((a) => a.status === "ACTIVE").map((a) => <option key={a.id} value={a.id}>{a.id} · {a.name} — {a.location}</option>)}</select>}</Field>
            )}
            {method === "CARD" && s.demo && (
              <label className="mt-3 flex items-center gap-2 text-xs text-fg-dim"><input type="checkbox" className="accent-[#E11D2E]" checked={decline} onChange={(e) => setDecline(e.target.checked)} />Demo: simulate a declined card</label>
            )}
          </fieldset>
        </div>

        <aside className="h-fit border border-ink-500 bg-ink-900 p-4 lg:sticky lg:top-0">
          <div className="eyebrow">Order summary</div>
          <div className={cn("h-display mt-2 text-2xl", type.tier !== "standard" && "text-gold-light")}>{type.name}</div>
          <ul className="mt-2 space-y-1 text-xs text-fg-muted">{type.perks.map((p) => <li key={p}>· {p}</li>)}</ul>
          <dl className="mt-4 space-y-2 border-t border-ink-600 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-fg-dim">{naira(type.price)} × {quantity}</dt><dd className="tabular-nums">{naira(type.price * quantity)}</dd></div>
            {promo && <div className="flex justify-between text-ok"><dt>{promo.code} −{promo.percentOff}%</dt><dd className="tabular-nums">−{naira((type.price - unit) * quantity)}</dd></div>}
            <div className="flex items-baseline justify-between border-t border-ink-600 pt-3"><dt className="eyebrow">Total</dt><dd className="text-2xl font-semibold tabular-nums">{naira(unit * quantity)}</dd></div>
          </dl>
          <Button type="submit" variant={type.tier === "elite" ? "gold" : "primary"} size="lg" loading={busy} className="mt-4 w-full">{method === "BANK_TRANSFER" || method === "USSD" ? "Create order" : `Take payment · ${naira(unit * quantity)}`}</Button>
          <p className="mt-3 text-[11px] leading-snug text-fg-dim">{s.demo ? "Demo gateway — no money moves. " : ""}Ticket IDs and QR codes are issued by the server after payment.</p>
        </aside>
      </form>
    </Modal>
  );
}
