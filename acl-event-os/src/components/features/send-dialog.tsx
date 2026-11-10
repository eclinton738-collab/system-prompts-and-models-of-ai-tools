"use client";

import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { isSold } from "@/lib/metrics";
import { useOps } from "../ops-provider";
import { Button, Modal, SearchInput } from "../ui";

const CHANNELS = [["EMAIL", "Email"], ["SMS", "SMS"], ["WHATSAPP", "WhatsApp"]] as const;

export function SendDialog({ initialTicketId, onClose }: { initialTicketId?: string; onClose: () => void }) {
  const { s, ix, call } = useOps();
  const [q, setQ] = useState(initialTicketId ?? "");
  const [picked, setPicked] = useState(initialTicketId ?? "");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number][0]>("EMAIL");
  const [busy, setBusy] = useState(false);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return s.tickets
      .filter((t) => isSold(t, ix.payment.get(t.paymentId)) && t.status !== "SUSPENDED")
      .filter((t) => { if (!needle) return true; const a = ix.attendee.get(t.attendeeId)!; return t.id.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle) || a.phone.replace(/\s/g, "").includes(needle.replace(/\s/g, "")); })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  }, [q, s.tickets, ix]);
  const ticket = ix.ticket.get(picked);
  const attendee = ticket && ix.attendee.get(ticket.attendeeId);

  async function send() {
    if (!ticket || !attendee) return;
    setBusy(true);
    try {
      await call("tickets.send", { ticketId: ticket.id, channel });
      toast.success(`E-ticket ${ticket.id} queued to ${channel === "EMAIL" ? attendee.email : attendee.phone}`, { description: s.demo ? "Demo mode: logged to the outbox, not actually sent." : undefined });
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title="Send E-Ticket" description="Find a paid ticket and deliver its QR e-ticket to the holder." size="md">
      <div className="space-y-4">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPicked(""); }} placeholder="Ticket ID, name or phone" />
        <ul className="max-h-64 divide-y divide-ink-700 overflow-y-auto border border-ink-600">
          {matches.length === 0 && <li className="p-4 text-center text-sm text-fg-dim">No paid ticket matches “{q}”.</li>}
          {matches.map((t) => { const a = ix.attendee.get(t.attendeeId)!; return (
            <li key={t.id}><button type="button" aria-pressed={picked === t.id} onClick={() => setPicked(t.id)} className={cn("flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition", picked === t.id ? "bg-acl/15" : "hover:bg-white/5")}>
              <span className="min-w-0"><span className="ticket-id block">{t.id}</span><span className="block truncate text-xs text-fg-dim">{a.name} · {a.email}</span></span>
              <span className="shrink-0 text-xs text-fg-muted">{ix.type.get(t.typeId)!.name}</span>
            </button></li>
          ); })}
        </ul>
        <div role="radiogroup" aria-label="Channel" className="grid grid-cols-3 gap-2">
          {CHANNELS.map(([v, label]) => <button key={v} type="button" role="radio" aria-checked={channel === v} onClick={() => setChannel(v)} className={cn("border py-2 font-display text-xs font-semibold uppercase tracking-[0.12em]", channel === v ? "border-acl bg-acl/10" : "border-ink-500 text-fg-muted hover:border-fg-dim")}>{label}</button>)}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-fg-dim">{attendee ? `To ${channel === "EMAIL" ? attendee.email : attendee.phone}` : "Select a ticket"}</p>
          <Button variant="primary" disabled={!ticket} loading={busy} onClick={send}><Send className="h-4 w-4" />Send e-ticket</Button>
        </div>
      </div>
    </Modal>
  );
}
