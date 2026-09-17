"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { QrCode } from "@/components/checkin/QrCode";
import { useToast } from "@/components/ui/Toast";
import { useAcl } from "@/lib/client/provider";
import { apiSend, ApiError } from "@/lib/client/api";
import { tableBookingSchema } from "@/lib/domain/schemas";
import { TICKET_TYPES } from "@/lib/domain/catalog";
import { formatNaira } from "@/lib/domain/format";
import { CheckCircle2, Users } from "lucide-react";
import type { EventTable, PaymentMethod, Ticket } from "@/lib/domain/types";

const METHODS: Array<[PaymentMethod, string]> = [
  ["BANK_TRANSFER", "Bank Transfer"],
  ["CARD", "Card"],
  ["POS_AGENT", "POS / Agent"],
  ["CASH_OUTLET", "Cash Outlet"],
  ["USSD", "USSD"],
];

export function TableBookingModal({
  table,
  onClose,
}: {
  table: EventTable | null;
  onClose: () => void;
}) {
  const { refresh, state } = useAcl();
  const toast = useToast();
  const [form, setForm] = useState({ buyerName: "", buyerPhone: "", buyerEmail: "", method: "BANK_TRANSFER" as PaymentMethod });
  const [guests, setGuests] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ticket: Ticket; qr?: string } | null>(null);

  useEffect(() => {
    if (!table) return;
    setForm({ buyerName: "", buyerPhone: "", buyerEmail: "", method: "BANK_TRANSFER" });
    setGuests(Array.from({ length: table.capacity }, () => ""));
    setErrors({});
    setDone(null);
  }, [table]);

  if (!table) return null;
  const def = TICKET_TYPES[table.type];

  async function submit() {
    if (!table) return;
    const parsed = tableBookingSchema.safeParse({ tableId: table.id, ...form, guests });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }
    setBusy(true);
    try {
      const result = await apiSend<{ ticket: Ticket; qr?: string }>("/api/tables", parsed.data);
      setDone(result);
      await refresh();
      toast.push({ tone: "success", title: "Table booked", body: `${table.label} — ${formatNaira(def.price)}` });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields ?? {});
      toast.push({ tone: "error", title: "Booking failed", body: err instanceof Error ? err.message : "" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(table)}
      onClose={onClose}
      title={done ? "Table booked" : `Book ${table.label}`}
      subtitle={`${def.name} — ${formatNaira(def.price)} · seats ${table.capacity}`}
      size="md"
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="gold" onClick={submit} loading={busy}>
              Book for {formatNaira(def.price)}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[3px] border border-ok/45 bg-ok/[0.08] px-3.5 py-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
            <div>
              <p className="font-display text-[13px] font-extrabold uppercase tracking-[0.06em] text-ok">
                {table.label} confirmed
              </p>
              <p className="mt-0.5 text-[12px] text-ink-2">
                {done.ticket.id} · {done.ticket.attendeeName}
              </p>
            </div>
          </div>
          <div className="acl-inset flex flex-col items-center gap-3 p-4 sm:flex-row sm:items-start">
            <QrCode token={done.qr} size={140} label={done.ticket.id} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-ink-2">
                This single credential admits the whole table. Scanning it at the Tables Entrance marks all{" "}
                {table.capacity} guests as present.
              </p>
              <Badge tone="gold" className="mt-2">
                Seats {table.capacity}
              </Badge>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Buyer / company" required error={errors.buyerName}>
              <Input
                value={form.buyerName}
                onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                placeholder="Kingsley Group"
                invalid={Boolean(errors.buyerName)}
              />
            </Field>
            <Field label="Phone" required error={errors.buyerPhone}>
              <Input
                value={form.buyerPhone}
                onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                placeholder="0803 123 4567"
                inputMode="tel"
                invalid={Boolean(errors.buyerPhone)}
              />
            </Field>
            <Field label="Email" required error={errors.buyerEmail}>
              <Input
                type="email"
                value={form.buyerEmail}
                onChange={(e) => setForm((f) => ({ ...f, buyerEmail: e.target.value }))}
                placeholder="bookings@kingsley.ng"
                invalid={Boolean(errors.buyerEmail)}
              />
            </Field>
            <Field label="Payment method" required>
              <Select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}>
                {METHODS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <p className="acl-label mb-2 flex items-center gap-1.5">
              <Users className="h-3 w-3" /> Guest list ({table.capacity} seats)
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {guests.map((guest, i) => (
                <Input
                  key={i}
                  value={guest}
                  onChange={(e) => setGuests((g) => g.map((v, idx) => (idx === i ? e.target.value : v)))}
                  placeholder={i === 0 ? "Seat 1 — buyer" : `Seat ${i + 1}`}
                  aria-label={`Guest ${i + 1}`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-4">
              Names can be added later. Empty seats are listed as unnamed guests.
            </p>
          </div>

          {form.method === "BANK_TRANSFER" || form.method === "CASH_OUTLET" ? (
            <p className="rounded-[3px] border border-warn/40 bg-warn/10 px-3 py-2 text-[11.5px] text-warn">
              This booking settles as pending until finance confirms the transfer. The table is held, but the
              credential is refused at the gate until payment clears.
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
