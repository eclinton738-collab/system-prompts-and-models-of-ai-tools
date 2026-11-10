"use client";

import { Plus, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useOps } from "@/components/ops-provider";
import { Badge, Button, Field, PageHeader, Panel, TableWrap, Toggle, useConfirm } from "@/components/ui";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/format";
import { ALL_PERMISSIONS, ROLE_LABELS, ROLES } from "@/lib/permissions";
import { eventSchema } from "@/lib/schemas";
import type { Gate, Permission, Role, TicketTypeId } from "@/lib/types";

/** Venue time is WAT (UTC+1, no daylight saving). */
const toLocal = (iso: string) => new Date(Date.parse(iso) + 3_600_000).toISOString().slice(0, 16);
const fromLocal = (v: string) => `${v}:00+01:00`;

export default function SettingsPage() {
  const { s, call } = useOps();
  const confirm = useConfirm();
  const e = s.event;
  const initial = () => ({ name: e.name, venue: e.venue, location: e.location, capacity: String(e.capacity), status: e.status, doorsOpenAt: toLocal(e.doorsOpenAt), mainCardAt: toLocal(e.mainCardAt), endsAt: toLocal(e.endsAt), revenueTarget: String(e.revenueTarget), refundPolicy: e.refundPolicy });
  const [ev, setEv] = useState(initial);
  const [evErr, setEvErr] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(s.ticketTypes.map((t) => [t.id, String(t.price)])));
  const [rules, setRules] = useState({ ...e.rules, maxPerOrder: String(e.rules.maxPerOrder) });
  const [newGate, setNewGate] = useState("");
  const [busy, setBusy] = useState("");
  // Re-sync forms when the server copy changes underneath (e.g. demo reset).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setEv(initial()); setPrices(Object.fromEntries(s.ticketTypes.map((t) => [t.id, String(t.price)]))); setRules({ ...e.rules, maxPerOrder: String(e.rules.maxPerOrder) }); }, [JSON.stringify(e), JSON.stringify(s.ticketTypes.map((t) => t.price))]);

  const save = async (key: string, title: string, body: React.ReactNode, fn: () => Promise<unknown>, danger = false) => {
    const r = await confirm({ title, body, confirmLabel: "Save changes", danger });
    if (!r.ok) return;
    setBusy(key);
    try { await fn(); toast.success("Settings saved"); } catch (err) { toast.error((err as Error).message); } finally { setBusy(""); }
  };

  function saveEvent(f: React.FormEvent) {
    f.preventDefault();
    const input = { ...ev, doorsOpenAt: fromLocal(ev.doorsOpenAt), mainCardAt: fromLocal(ev.mainCardAt), endsAt: fromLocal(ev.endsAt) };
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) { setEvErr(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setEvErr({});
    save("event", "Update event details?", <>These details appear on every e-ticket, report and gate screen from now on.</>, () => call("settings.event", parsed.data));
  }
  const priceChanges = s.ticketTypes.filter((t) => Number(prices[t.id]) !== t.price);
  const set = (k: keyof typeof ev) => (x: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setEv((v) => ({ ...v, [k]: x.target.value }));
  const gateUpdate = (g: Gate, patch: Partial<Gate>) => call("settings.gate", { gateId: g.id, name: g.name, active: g.active, allowedTypes: g.allowedTypes, ...patch }).then(() => toast.success(`${g.name} updated`), (err) => toast.error(err.message));

  async function togglePerm(role: Role, perm: Permission, on: boolean) {
    const cur = s.rolePermissions[role];
    const next = on ? [...cur, perm] : cur.filter((p) => p !== perm);
    const label = ALL_PERMISSIONS.find((p) => p.id === perm)!.label;
    await save(`perm`, `${on ? "Grant" : "Revoke"} permission?`, <>{on ? "Allow" : "Stop"} <b className="text-fg">{ROLE_LABELS[role]}</b> {on ? "to" : "from being able to"} “{label.toLowerCase()}”. Takes effect immediately for everyone with that role.</>, () => call("settings.permissions", { role: role as Exclude<Role, "SUPER_ADMIN">, permissions: next }), !on);
  }

  return (
    <div>
      <PageHeader title="Event Settings" subtitle="Configuration for this event. Every change asks for confirmation and applies immediately across all devices." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Event Details">
          <form onSubmit={saveEvent} noValidate className="grid gap-3 sm:grid-cols-2">
            <Field label="Event name" error={evErr.name} className="sm:col-span-2">{(p) => <input {...p} className="input" value={ev.name} onChange={set("name")} />}</Field>
            <Field label="Venue" error={evErr.venue}>{(p) => <input {...p} className="input" value={ev.venue} onChange={set("venue")} />}</Field>
            <Field label="Location" error={evErr.location}>{(p) => <input {...p} className="input" value={ev.location} onChange={set("location")} />}</Field>
            <Field label="Doors open (WAT)" error={evErr.doorsOpenAt}>{(p) => <input {...p} className="input" type="datetime-local" value={ev.doorsOpenAt} onChange={set("doorsOpenAt")} />}</Field>
            <Field label="Main card (WAT)" error={evErr.mainCardAt}>{(p) => <input {...p} className="input" type="datetime-local" value={ev.mainCardAt} onChange={set("mainCardAt")} />}</Field>
            <Field label="Event ends (WAT)" error={evErr.endsAt} hint="Tickets expire after this time">{(p) => <input {...p} className="input" type="datetime-local" value={ev.endsAt} onChange={set("endsAt")} />}</Field>
            <Field label="Status">{(p) => <select {...p} className="input" value={ev.status} onChange={set("status")}><option value="DRAFT">Draft</option><option value="ON_SALE">On sale</option><option value="LIVE">Live</option><option value="ENDED">Ended</option></select>}</Field>
            <Field label="Capacity" error={evErr.capacity} hint={`${s.seats.length} places on the seating plan`}>{(p) => <input {...p} className="input" type="number" min={1} value={ev.capacity} onChange={set("capacity")} />}</Field>
            <Field label="Projected revenue (₦)" error={evErr.revenueTarget} hint={naira(Number(ev.revenueTarget) || 0)}>{(p) => <input {...p} className="input" type="number" min={0} step={50000} value={ev.revenueTarget} onChange={set("revenueTarget")} />}</Field>
            <Field label="Refund policy" error={evErr.refundPolicy} className="sm:col-span-2">{(p) => <textarea {...p} className="input" rows={3} value={ev.refundPolicy} onChange={set("refundPolicy")} />}</Field>
            <div className="sm:col-span-2"><Button type="submit" variant="primary" loading={busy === "event"}><Save className="h-4 w-4" />Save event details</Button></div>
          </form>
        </Panel>

        <div className="space-y-4">
          <Panel title="Ticket Prices" eyebrow="Applies to new sales only — issued tickets keep their price">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {s.ticketTypes.map((t) => <Field key={t.id} label={t.name} hint={Number(prices[t.id]) !== t.price ? `was ${naira(t.price)}` : undefined}>{(p) => <input {...p} className="input" type="number" min={0} step={500} value={prices[t.id] ?? ""} onChange={(x) => setPrices({ ...prices, [t.id]: x.target.value })} />}</Field>)}
            </div>
            <Button className="mt-4" variant="primary" disabled={priceChanges.length === 0} loading={busy === "prices"} onClick={() => save("prices", "Change ticket prices?", <ul className="space-y-1">{priceChanges.map((t) => <li key={t.id}><b className="text-fg">{t.name}</b>: {naira(t.price)} → {naira(Number(prices[t.id]) || 0)}</li>)}</ul>, () => call("settings.prices", { prices: Object.fromEntries(s.ticketTypes.map((t) => [t.id, Number(prices[t.id]) || 0])) as Record<TicketTypeId, number> }))}><Save className="h-4 w-4" />Save prices</Button>
          </Panel>

          <Panel title="Ticket Rules">
            <div className="divide-y divide-ink-700">
              <Toggle label="Ticket sales open" description="Turn off to stop all new sales, including agents." checked={rules.salesOpen} onChange={(v) => setRules({ ...rules, salesOpen: v })} />
              <Toggle label="Require signed QR codes" description="Camera scans without a valid ACL signature are rejected. Manual entry still works." checked={rules.requireSignedQr} onChange={(v) => setRules({ ...rules, requireSignedQr: v })} />
              <Toggle label="Refunds enabled" description="Finance can refund paid, unused tickets." checked={rules.refundsEnabled} onChange={(v) => setRules({ ...rules, refundsEnabled: v })} />
              <Toggle label="Single entry per ticket" description="A ticket admits once. This rule is enforced by the server and cannot be disabled." checked disabled onChange={() => {}} />
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <Field label="Max tickets per order" className="w-44">{(p) => <input {...p} className="input" type="number" min={1} max={20} value={rules.maxPerOrder} onChange={(x) => setRules({ ...rules, maxPerOrder: x.target.value })} />}</Field>
              <Button variant="primary" loading={busy === "rules"} onClick={() => save("rules", "Update ticket rules?", <>{!rules.requireSignedQr && <span className="text-warn">Turning off signed QR lets any QR containing a ticket ID be scanned. </span>}Rules apply to all gates and sellers immediately.</>, () => call("settings.rules", { maxPerOrder: Number(rules.maxPerOrder) || 1, requireSignedQr: rules.requireSignedQr, refundsEnabled: rules.refundsEnabled, salesOpen: rules.salesOpen }), !rules.requireSignedQr)}><Save className="h-4 w-4" />Save rules</Button>
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Gates" eyebrow="Which ticket types each entrance admits" className="mt-4" bodyClassName="p-0">
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Gate</th>{s.ticketTypes.map((t) => <th key={t.id} className="text-center">{t.shortName}</th>)}<th className="num">Open</th></tr></thead>
            <tbody>
              {s.gates.map((g) => (
                <tr key={g.id}>
                  <td><span className="font-medium">{g.name}</span><span className="ml-2 font-mono text-xs text-fg-dim">{g.id}</span></td>
                  {s.ticketTypes.map((t) => { const on = g.allowedTypes.includes(t.id); return <td key={t.id} className="text-center"><input type="checkbox" className="h-4 w-4 accent-[#E11D2E]" aria-label={`${g.name} admits ${t.name}`} checked={on} disabled={on && g.allowedTypes.length === 1} onChange={() => gateUpdate(g, { allowedTypes: on ? g.allowedTypes.filter((x) => x !== t.id) : [...g.allowedTypes, t.id] })} /></td>; })}
                  <td className="num"><span className="inline-block"><Toggle label={`${g.name} open`} checked={g.active} onChange={async (v) => { if (!v) { const r = await confirm({ title: `Close ${g.name}?`, danger: true, confirmLabel: "Close gate", body: <>Scanners at this gate stop working until it is reopened.</> }); if (!r.ok) return; } gateUpdate(g, { active: v }); }} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <form className="flex flex-wrap items-center gap-2 border-t border-ink-600 p-3" onSubmit={(f) => { f.preventDefault(); const name = newGate.trim(); if (name.length < 2) { toast.error("Enter a gate name"); return; } call("settings.gate", { name, active: true, allowedTypes: s.ticketTypes.map((t) => t.id) }).then(() => { toast.success(`${name} added`); setNewGate(""); }, (err) => toast.error(err.message)); }}>
          <input aria-label="New gate name" className="input h-9 max-w-xs" placeholder="New gate name, e.g. Media Entrance" value={newGate} onChange={(x) => setNewGate(x.target.value)} />
          <Button type="submit" size="sm"><Plus className="h-3.5 w-3.5" />Add gate</Button>
        </form>
      </Panel>

      <Panel title="Staff Permissions" eyebrow="Role-based access — enforced on the server for every action" className="mt-4" bodyClassName="p-0" action={<Badge tone="info"><ShieldCheck className="h-3 w-3" />Super Admin always has full access</Badge>}>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Permission</th>{ROLES.map((r) => <th key={r} className="text-center">{ROLE_LABELS[r]}</th>)}</tr></thead>
            <tbody>
              {ALL_PERMISSIONS.map((perm, i) => (
                <tr key={perm.id} className={cn(i > 0 && ALL_PERMISSIONS[i - 1].group !== perm.group && "[&>td]:border-t [&>td]:border-t-ink-500")}>
                  <td><span className="mr-2 inline-block w-20 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-dim">{perm.group}</span>{perm.label}</td>
                  {ROLES.map((r) => { const on = s.rolePermissions[r].includes(perm.id); const locked = r === "SUPER_ADMIN" || perm.id === "settings.manage"; return (
                    <td key={r} className="text-center"><input type="checkbox" className="h-4 w-4 accent-ok disabled:opacity-40" aria-label={`${ROLE_LABELS[r]}: ${perm.label}`} checked={on} disabled={locked} onChange={() => togglePerm(r, perm.id, !on)} /></td>
                  ); })}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      {s.demo && (
        <Panel title="Demo Data" tone="alert" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-sm text-fg-muted">This environment runs on an in-memory demo store with the clock pinned to fight night. Resetting restores the original dataset and discards every sale, scan and setting change made since.</p>
            <Button variant="danger" loading={busy === "reset"} onClick={async () => { const r = await confirm({ title: "Reset demo data?", danger: true, confirmLabel: "Reset everything", body: <>All sales, scans, refunds and settings changes made in this session will be lost.</> }); if (!r.ok) return; setBusy("reset"); try { await call("settings.reset", {}); toast.success("Demo data restored"); } catch (err) { toast.error((err as Error).message); } finally { setBusy(""); } }}><RotateCcw className="h-4 w-4" />Reset demo data</Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
