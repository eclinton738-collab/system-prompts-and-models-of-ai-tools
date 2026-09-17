"use client";

import { useState } from "react";
import { Store, UserPlus, Download } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { DataTable, Th, Td, Tr, EmptyState, TableSkeleton } from "@/components/ui/Table";
import { SellTicketModal } from "@/components/ticketing/SellTicketModal";
import { useResource } from "@/lib/client/useResource";
import { useAcl } from "@/lib/client/provider";
import { apiSend, ApiError, downloadCsv } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { agentSchema } from "@/lib/domain/schemas";
import { formatNaira, formatNumber } from "@/lib/domain/format";
import type { AgentPerformance } from "@/lib/domain/stats";
import type { Agent } from "@/lib/domain/types";

export default function AgentsPage() {
  return (
    <Guard permission="agents.view">
      <Agents />
    </Guard>
  );
}

function Agents() {
  const { allows, refresh } = useAcl();
  const toast = useToast();
  const { data, loading } = useResource<AgentPerformance[]>("/api/agents");
  const [adding, setAdding] = useState(false);
  const [selling, setSelling] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Agent | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", location: "", commissionRate: "5" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const totals = (data ?? []).reduce(
    (acc, row) => ({
      sales: acc.sales + row.sales,
      revenue: acc.revenue + row.revenue,
      commission: acc.commission + row.commission,
    }),
    { sales: 0, revenue: 0, commission: 0 },
  );

  async function createAgent() {
    const parsed = agentSchema.safeParse({ ...form, commissionRate: Number(form.commissionRate) / 100 });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }
    setBusy(true);
    try {
      const agent = await apiSend<Agent>("/api/agents", parsed.data);
      toast.push({ tone: "success", title: "Agent added", body: `${agent.id} — ${agent.name}` });
      setAdding(false);
      setForm({ name: "", phone: "", location: "", commissionRate: "5" });
      setErrors({});
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields ?? {});
      toast.push({ tone: "error", title: "Could not add agent", body: err instanceof Error ? err.message : "" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    if (!statusTarget) return;
    setBusy(true);
    try {
      const next = statusTarget.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      await apiSend(`/api/agents/${statusTarget.id}`, { status: next }, "PATCH");
      toast.push({ tone: "success", title: `Agent ${next.toLowerCase()}` });
      setStatusTarget(null);
      await refresh();
    } catch (err) {
      toast.push({ tone: "error", title: "Could not update", body: err instanceof Error ? err.message : "" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACL Field Sales"
        title="Agents / POS"
        description="Field agents selling into Aba and the South East. Every ticket they sell carries their agent ID — agents never mint ticket numbers themselves."
        actions={
          <>
            {allows("reports.export") ? (
              <Button
                variant="outline"
                onClick={() =>
                  downloadCsv("/api/reports/agent-performance?format=csv", "acl-agent-performance.csv").catch(() =>
                    toast.push({ tone: "error", title: "Export failed" }),
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            ) : null}
            {allows("ticketing.sell") ? (
              <Button variant="outline" onClick={() => setSelling(true)}>
                Agent sale
              </Button>
            ) : null}
            {allows("agents.manage") ? (
              <Button variant="primary" onClick={() => setAdding(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Add agent
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-3 p-3 sm:p-4 lg:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Agent tickets sold" value={formatNumber(totals.sales)} />
          <Stat label="Agent revenue" value={formatNaira(totals.revenue)} tone="text-ok" />
          <Stat label="Commission owed" value={formatNaira(totals.commission)} tone="text-gold" />
        </div>

        <Panel>
          <PanelHeader
            title="Agent Performance"
            icon={<Store className="h-3.5 w-3.5" />}
            subtitle="Ranked by revenue generated"
          />
          {loading && !data ? (
            <TableSkeleton rows={6} cols={8} />
          ) : !data?.length ? (
            <EmptyState title="No agents yet" body="Add a field agent to start selling through POS." icon={<Store className="h-5 w-5" />} />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Agent ID</Th>
                  <Th>Name</Th>
                  <Th>Phone</Th>
                  <Th>Location</Th>
                  <Th align="right">Sales</Th>
                  <Th align="right">Revenue</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Commission</Th>
                  <Th>Status</Th>
                  {allows("agents.manage") ? <Th /> : null}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <Tr key={row.agent.id}>
                    <Td mono>{row.agent.id}</Td>
                    <Td className="text-ink">{row.agent.name}</Td>
                    <Td mono className="text-ink-3">{row.agent.phone}</Td>
                    <Td>{row.agent.location}</Td>
                    <Td align="right" mono>{formatNumber(row.sales)}</Td>
                    <Td align="right" mono className="text-ok">{formatNaira(row.revenue)}</Td>
                    <Td align="right" mono>{(row.agent.commissionRate * 100).toFixed(1)}%</Td>
                    <Td align="right" mono className="text-gold">{formatNaira(row.commission)}</Td>
                    <Td>
                      <Badge tone={row.agent.status === "ACTIVE" ? "ok" : row.agent.status === "SUSPENDED" ? "danger" : "warn"} dot>
                        {row.agent.status}
                      </Badge>
                    </Td>
                    {allows("agents.manage") ? (
                      <Td align="right">
                        <Button size="sm" variant="ghost" onClick={() => setStatusTarget(row.agent)}>
                          {row.agent.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </Button>
                      </Td>
                    ) : null}
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Panel>

        <Panel className="p-4">
          <p className="acl-label mb-2">How agent sales are bound</p>
          <p className="max-w-3xl text-[12.5px] leading-relaxed text-ink-3">
            An agent supplies a customer and a tier. The server mints the ticket ID, stamps the agent ID onto the
            ticket and the payment, and issues the signed QR. A suspended agent cannot complete a sale, and no
            client — agent app included — can choose or reuse a ticket number.
          </p>
        </Panel>
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add field agent"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={createAgent} loading={busy}>
              Add agent
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Full name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} invalid={Boolean(errors.name)} />
          </Field>
          <Field label="Phone" required error={errors.phone}>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0803 123 4567" invalid={Boolean(errors.phone)} />
          </Field>
          <Field label="Selling location" required error={errors.location}>
            <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Ariaria Market" invalid={Boolean(errors.location)} />
          </Field>
          <Field label="Commission %" required error={errors.commissionRate} hint="Maximum 25%">
            <Input
              type="number"
              min={0}
              max={25}
              step={0.5}
              value={form.commissionRate}
              onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
              invalid={Boolean(errors.commissionRate)}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={toggleStatus}
        title={statusTarget?.status === "ACTIVE" ? "Suspend this agent?" : "Activate this agent?"}
        body={
          statusTarget?.status === "ACTIVE"
            ? `${statusTarget?.name} will immediately be unable to sell tickets. Tickets already sold stay valid.`
            : `${statusTarget?.name} will be able to sell tickets again.`
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Suspend" : "Activate"}
        tone={statusTarget?.status === "ACTIVE" ? "danger" : "primary"}
        loading={busy}
      />

      <SellTicketModal open={selling} onClose={() => setSelling(false)} />
    </>
  );
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <Panel className="p-3.5">
      <p className="acl-label">{label}</p>
      <p className={`acl-stat mt-1.5 text-[24px] leading-none ${tone}`}>{value}</p>
    </Panel>
  );
}
