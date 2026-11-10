"use client";

import { Megaphone, Plus, Send, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOps } from "@/components/ops-provider";
import { Badge, Button, EmptyState, Field, PageHeader, Panel, Progress, TableWrap, Toggle, useConfirm } from "@/components/ui";
import { dateTime, naira } from "@/lib/format";
import { isSold } from "@/lib/metrics";
import { broadcastSchema, promoSchema } from "@/lib/schemas";

const SEGMENTS = { ALL_PAID: "All ticket holders", NOT_CHECKED_IN: "Not yet arrived", PREMIUM: "VVIP, Ringside & Tables", PENDING_PAYMENT: "Awaiting payment" } as const;
type Segment = keyof typeof SEGMENTS;
const TAGLINES = ["Unchained. Unbreakable. Unbound.", "Fighters. Stories. Africa. The World.", "Built by fighters for fighters.", "ACL — Born to be great."];

export default function MarketingPage() {
  const { s, ix, call } = useOps();
  const confirm = useConfirm();
  const [promo, setPromo] = useState({ code: "", percentOff: "10", maxUses: "50" });
  const [promoErr, setPromoErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState({ segment: "NOT_CHECKED_IN" as Segment, channel: "SMS" as "EMAIL" | "SMS" | "WHATSAPP", subject: "", body: "" });
  const [msgErr, setMsgErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const audience = useMemo(() => {
    const count = (seg: Segment) => new Set(s.tickets.filter((t) => {
      const p = ix.payment.get(t.paymentId);
      if (seg === "PENDING_PAYMENT") return p?.status === "PENDING" && t.status === "ACTIVE";
      if (!isSold(t, p)) return false;
      return seg === "NOT_CHECKED_IN" ? t.status === "ACTIVE" : seg === "PREMIUM" ? t.typeId !== "GEN" && t.typeId !== "VIP" : true;
    }).map((t) => t.attendeeId)).size;
    return Object.fromEntries((Object.keys(SEGMENTS) as Segment[]).map((k) => [k, count(k)])) as Record<Segment, number>;
  }, [s.tickets, ix]);
  const promoRevenue = (code: string) => ix.sold.filter((t) => t.promoCode === code).reduce((a, t) => a + t.pricePaid, 0);

  async function createPromo(e: React.FormEvent) {
    e.preventDefault();
    const parsed = promoSchema.safeParse(promo);
    if (!parsed.success) { setPromoErr(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setPromoErr({});
    try { await call("promos.create", parsed.data); toast.success(`Promo ${parsed.data.code} is live`); setPromo({ code: "", percentOff: "10", maxUses: "50" }); } catch (err) { toast.error((err as Error).message); }
  }
  async function broadcast(e: React.FormEvent) {
    e.preventDefault();
    const parsed = broadcastSchema.safeParse(msg);
    if (!parsed.success) { setMsgErr(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setMsgErr({});
    const r = await confirm({ title: "Send this broadcast?", confirmLabel: `Send to ${audience[msg.segment]}`, body: <>“{msg.subject}” will go to <b className="text-fg">{audience[msg.segment]} {SEGMENTS[msg.segment].toLowerCase()}</b> by {msg.channel}.{s.demo && " Demo mode: the message is logged to the outbox and not actually delivered."}</> });
    if (!r.ok) return;
    setBusy(true);
    try { await call("marketing.broadcast", parsed.data); toast.success("Broadcast queued"); setMsg({ ...msg, subject: "", body: "" }); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Marketing" subtitle="Promo codes that apply at checkout, and broadcasts to ticket holders." />
      <section className="arena mb-4 grid gap-px overflow-hidden border border-ink-600 sm:grid-cols-2 xl:grid-cols-4" aria-label="Brand lines">
        {TAGLINES.map((t) => <button key={t} type="button" onClick={() => { navigator.clipboard?.writeText(t).then(() => toast.success("Copied"), () => toast.error("Copy failed")); }} title="Copy" className="bg-black/40 p-5 text-left transition hover:bg-black/10"><span className="h-display block text-2xl leading-tight">{t}</span><span className="eyebrow mt-2 block">Copy line</span></button>)}
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Promo Codes" bodyClassName="p-0">
          <form onSubmit={createPromo} noValidate className="grid grid-cols-2 items-start gap-3 border-b border-ink-600 p-4 sm:grid-cols-[1fr_110px_110px_auto]">
            <Field label="Code" error={promoErr.code} className="col-span-2 sm:col-span-1">{(p) => <input {...p} className="input uppercase" placeholder="LIONSDEN20" value={promo.code} onChange={(e) => setPromo({ ...promo, code: e.target.value })} />}</Field>
            <Field label="% off" error={promoErr.percentOff}>{(p) => <input {...p} className="input" type="number" min={1} max={100} value={promo.percentOff} onChange={(e) => setPromo({ ...promo, percentOff: e.target.value })} />}</Field>
            <Field label="Max uses" error={promoErr.maxUses}>{(p) => <input {...p} className="input" type="number" min={1} value={promo.maxUses} onChange={(e) => setPromo({ ...promo, maxUses: e.target.value })} />}</Field>
            <Button type="submit" variant="primary" className="col-span-2 sm:col-span-1 sm:mt-[22px]"><Plus className="h-4 w-4" />Create</Button>
          </form>
          {s.promoCodes.length === 0 ? <EmptyState icon={Tag} title="No promo codes" /> : (
            <TableWrap><table className="tbl">
              <thead><tr><th>Code</th><th className="num">Discount</th><th>Redemptions</th><th className="num">Revenue</th><th className="num">Active</th></tr></thead>
              <tbody>{s.promoCodes.map((p) => (
                <tr key={p.code}><td className="ticket-id">{p.code}</td><td className="num">{p.percentOff}%</td>
                  <td className="min-w-[150px]"><div className="flex items-center gap-2"><Progress value={p.uses / p.maxUses} label={`${p.code} redemptions`} tone="gold" /><span className="shrink-0 text-xs tabular-nums text-fg-dim">{p.uses}/{p.maxUses}</span></div></td>
                  <td className="num">{naira(promoRevenue(p.code))}</td>
                  <td className="num"><span className="inline-block"><Toggle label={`${p.code} active`} checked={p.active} onChange={(v) => call("promos.toggle", { code: p.code, active: v }).catch((e) => toast.error(e.message))} /></span></td></tr>
              ))}</tbody>
            </table></TableWrap>
          )}
        </Panel>

        <Panel title="Broadcast">
          <form onSubmit={broadcast} noValidate className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Audience" hint={`${audience[msg.segment]} recipients`}>{(p) => <select {...p} className="input" value={msg.segment} onChange={(e) => setMsg({ ...msg, segment: e.target.value as Segment })}>{(Object.keys(SEGMENTS) as Segment[]).map((k) => <option key={k} value={k}>{SEGMENTS[k]} ({audience[k]})</option>)}</select>}</Field>
              <Field label="Channel">{(p) => <select {...p} className="input" value={msg.channel} onChange={(e) => setMsg({ ...msg, channel: e.target.value as typeof msg.channel })}><option value="SMS">SMS</option><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option></select>}</Field>
            </div>
            <Field label="Subject" error={msgErr.subject}>{(p) => <input {...p} className="input" placeholder="Doors are open — main card at 9 PM" value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} />}</Field>
            <Field label="Message" error={msgErr.body} hint={`${msg.body.length}/1000`}>{(p) => <textarea {...p} className="input" rows={4} maxLength={1000} value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} />}</Field>
            <div className="flex items-center justify-between gap-3"><span className="text-xs text-fg-dim">{s.demo ? "Demo: logged to outbox, not delivered." : ""}</span><Button type="submit" variant="primary" loading={busy} disabled={audience[msg.segment] === 0}><Send className="h-4 w-4" />Send broadcast</Button></div>
          </form>
        </Panel>
      </div>

      <Panel title="Outbox" eyebrow="E-tickets & broadcasts" className="mt-4" bodyClassName="p-0">
        {s.messages.length === 0 ? <EmptyState icon={Megaphone} title="Nothing sent yet" /> : (
          <TableWrap className="max-h-[420px] overflow-y-auto"><table className="tbl">
            <thead><tr><th>Sent</th><th>Type</th><th>Channel</th><th>To</th><th>Subject</th><th className="num">Recipients</th><th>Status</th></tr></thead>
            <tbody>{s.messages.slice(0, 60).map((m) => <tr key={m.id}><td className="tabular-nums text-fg-muted">{dateTime(m.at)}</td><td><Badge tone={m.kind === "BROADCAST" ? "info" : "neutral"}>{m.kind === "BROADCAST" ? "Broadcast" : "E-ticket"}</Badge></td><td className="text-fg-muted">{m.channel}</td><td className="max-w-[220px] truncate">{m.kind === "BROADCAST" ? SEGMENTS[m.to as Segment] ?? m.to : m.to}</td><td className="max-w-[320px] truncate" title={m.body}>{m.subject}</td><td className="num">{m.recipients}</td><td><Badge tone="warn">Logged · demo</Badge></td></tr>)}</tbody>
          </table></TableWrap>
        )}
      </Panel>
    </div>
  );
}
