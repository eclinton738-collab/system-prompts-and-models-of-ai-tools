"use client";

import { Plus, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarsChart, compactNaira } from "@/components/charts";
import { useOps } from "@/components/ops-provider";
import { Badge, Button, Drawer, EmptyState, Field, KeyValue, Modal, PageHeader, Panel, TableWrap, useConfirm } from "@/components/ui";
import { useUi } from "@/components/ui-context";
import { dateTime, naira } from "@/lib/format";
import { agentStats } from "@/lib/metrics";
import { agentSchema } from "@/lib/schemas";
import { METHOD_COLOR } from "@/lib/theme";

const BLANK = { name: "", phone: "", location: "", commission: "5" };

export default function AgentsPage() {
  const { s, ix, can, call } = useOps();
  const { openTicket } = useUi();
  const confirm = useConfirm();
  const stats = useMemo(() => agentStats(s, ix).sort((a, b) => b.revenue - a.revenue), [s, ix]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const manage = can("agents.manage");
  const total = { sales: stats.reduce((a, x) => a + x.sales, 0), revenue: stats.reduce((a, x) => a + x.revenue, 0), commission: stats.reduce((a, x) => a + x.commission, 0) };
  const open = stats.find((x) => x.agent.id === openId);
  const openSales = open ? ix.sold.filter((t) => t.agentId === open.agent.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const parsed = agentSchema.safeParse({ name: form.name, phone: form.phone, location: form.location, commissionRate: Number(form.commission) / 100 });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(true);
    try { const a = await call<{ id: string }>("agents.create", parsed.data); toast.success(`Agent ${a.id} created`); setCreating(false); setForm(BLANK); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  async function setStatus(id: string, name: string, status: "ACTIVE" | "SUSPENDED") {
    if (status === "SUSPENDED") { const r = await confirm({ title: `Suspend ${name}?`, danger: true, confirmLabel: "Suspend agent", body: <>{id} will be unable to sell tickets until reactivated. Tickets already sold stay valid and keep this agent ID.</> }); if (!r.ok) return; }
    try { await call("agents.update", { agentId: id, status }); toast.success(status === "ACTIVE" ? `${id} reactivated` : `${id} suspended`); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Agents / POS" subtitle="The field sales network. Every agent sale carries the agent’s ID for life; ticket IDs are always issued by the server, never by the agent.">
        {manage && <Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New Agent</Button>}
      </PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {([["Active agents", String(s.agents.filter((a) => a.status === "ACTIVE").length), `${s.agents.length} registered`], ["Tickets via agents", total.sales.toLocaleString(), `${ix.sold.length ? Math.round((total.sales / ix.sold.length) * 100) : 0}% of all sales`], ["Agent revenue", naira(total.revenue), "paid tickets only"], ["Commission owed", naira(total.commission), "at each agent’s rate"]] as const)
          .map(([k, v, f]) => <div key={k} className="panel p-4"><div className="eyebrow">{k}</div><div className="mt-2 truncate text-2xl font-semibold tabular-nums">{v}</div><div className="mt-1 text-xs text-fg-dim">{f}</div></div>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Agent Directory" className="xl:col-span-2" bodyClassName="p-0">
          {stats.length === 0 ? <EmptyState icon={Store} title="No agents yet" body="Create an agent to start selling through POS." /> : (
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>Agent ID</th><th>Name</th><th>Phone</th><th>Location</th><th className="num">Sales</th><th className="num">Revenue</th><th className="num">Commission</th><th>Status</th>{manage && <th className="num">Action</th>}</tr></thead>
                <tbody>
                  {stats.map(({ agent: a, sales, revenue, commission }) => (
                    <tr key={a.id} className="cursor-pointer" tabIndex={0} role="button" aria-label={`Open ${a.id}`} onClick={() => setOpenId(a.id)} onKeyDown={(e) => { if (e.key === "Enter") setOpenId(a.id); }}>
                      <td className="ticket-id">{a.id}</td><td className="font-medium">{a.name}</td><td className="tabular-nums text-fg-muted">{a.phone}</td><td className="max-w-[200px] truncate text-fg-muted">{a.location}</td>
                      <td className="num">{sales}</td><td className="num">{naira(revenue)}</td><td className="num">{naira(commission)}<span className="ml-1.5 text-xs text-fg-dim">{Math.round(a.commissionRate * 100)}%</span></td>
                      <td><Badge tone={a.status === "ACTIVE" ? "ok" : "danger"} dot>{a.status}</Badge></td>
                      {manage && <td className="num"><Button size="sm" variant={a.status === "ACTIVE" ? "ghost" : "secondary"} onClick={(e) => { e.stopPropagation(); setStatus(a.id, a.name, a.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"); }}>{a.status === "ACTIVE" ? "Suspend" : "Reactivate"}</Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Panel>
        <Panel title="Revenue by Agent">
          <BarsChart height={280} data={stats.map((x) => ({ label: x.agent.id, revenue: x.revenue, sales: x.sales })) as never} series={{ key: "revenue", label: "Revenue", color: METHOD_COLOR.POS_AGENT, format: compactNaira }} extra={(r) => [["Tickets", String(r.sales)]]} />
        </Panel>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New agent" description="The agent ID is assigned automatically." size="sm">
        <form onSubmit={create} noValidate className="space-y-3">
          <Field label="Full name" error={errors.name}>{(p) => <input {...p} className="input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
          <Field label="Phone" error={errors.phone}>{(p) => <input {...p} className="input" inputMode="tel" placeholder="0803 123 4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}</Field>
          <Field label="Location / outlet" error={errors.location}>{(p) => <input {...p} className="input" placeholder="Ariaria Market, Aba" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />}</Field>
          <Field label="Commission %" error={errors.commissionRate} hint="0–30%">{(p) => <input {...p} className="input" type="number" min={0} max={30} step={0.5} value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} />}</Field>
          <div className="flex justify-end gap-2 pt-1"><Button onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>Create agent</Button></div>
        </form>
      </Modal>

      <Drawer open={!!open} onClose={() => setOpenId(null)} eyebrow={open?.agent.id} title={open?.agent.name ?? ""}>
        {open && (
          <div className="space-y-6">
            <KeyValue rows={[["Status", <Badge key="s" tone={open.agent.status === "ACTIVE" ? "ok" : "danger"} dot>{open.agent.status}</Badge>], ["Phone", open.agent.phone], ["Location", open.agent.location], ["Commission rate", `${Math.round(open.agent.commissionRate * 100)}%`], ["Tickets sold", open.sales], ["Revenue", naira(open.revenue)], ["Commission", naira(open.commission)]]} />
            <section><h3 className="eyebrow mb-2">Tickets sold by this agent · {openSales.length}</h3>
              {openSales.length === 0 ? <p className="text-sm text-fg-dim">No sales yet.</p> : (
                <ul className="space-y-1.5">{openSales.slice(0, 40).map((t) => <li key={t.id}><button type="button" onClick={() => { setOpenId(null); openTicket(t.id); }} className="flex w-full items-center justify-between gap-3 border border-ink-600 bg-ink-900 px-3 py-2 text-left text-sm hover:border-fg-dim"><span className="min-w-0"><span className="ticket-id block">{t.id}</span><span className="block truncate text-xs text-fg-dim">{ix.attendee.get(t.attendeeId)?.name} · {dateTime(t.createdAt)}</span></span><span className="tabular-nums">{naira(t.pricePaid)}</span></button></li>)}</ul>
              )}
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
