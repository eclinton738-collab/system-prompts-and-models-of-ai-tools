"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, ShieldCheck, DoorOpen } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Modal";
import { DataTable, Th, Td, Tr } from "@/components/ui/Table";
import { useAcl } from "@/lib/client/provider";
import { apiSend, ApiError } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { settingsSchema } from "@/lib/domain/schemas";
import { TICKET_TYPE_LIST, TYPE_COLOR } from "@/lib/domain/catalog";
import { ROLE_LABEL, ROLE_PERMISSIONS, PERMISSIONS } from "@/lib/domain/permissions";
import { formatNaira } from "@/lib/domain/format";
import type { EventStatus, Role } from "@/lib/domain/types";

const ROLES: Role[] = ["SUPER_ADMIN", "EVENT_MANAGER", "FINANCE", "CHECK_IN_STAFF", "TICKET_AGENT", "SECURITY"];

export default function SettingsPage() {
  return (
    <Guard permission="settings.view">
      <EventSettings />
    </Guard>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventSettings() {
  const { state, refresh, allows } = useAcl();
  const toast = useToast();
  const [form, setForm] = useState<null | {
    name: string;
    startsAt: string;
    venue: string;
    location: string;
    capacity: string;
    projectedRevenue: string;
    status: EventStatus;
    refundPolicy: string;
    rules: {
      doorsOpenMinutesBefore: string;
      entryClosesMinutesAfter: string;
      singleUseTickets: boolean;
      allowPendingPaymentOverride: boolean;
      refundWindowHours: string;
    };
    prices: Record<string, string>;
  }>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state || form) return;
    setForm({
      name: state.event.name,
      startsAt: toLocalInput(state.event.startsAt),
      venue: state.event.venue,
      location: state.event.location,
      capacity: String(state.event.capacity),
      projectedRevenue: String(state.event.projectedRevenue),
      status: state.event.status,
      refundPolicy: state.event.refundPolicy,
      rules: {
        doorsOpenMinutesBefore: String(state.event.rules.doorsOpenMinutesBefore),
        entryClosesMinutesAfter: String(state.event.rules.entryClosesMinutesAfter),
        singleUseTickets: state.event.rules.singleUseTickets,
        allowPendingPaymentOverride: state.event.rules.allowPendingPaymentOverride,
        refundWindowHours: String(state.event.rules.refundWindowHours),
      },
      prices: Object.fromEntries(TICKET_TYPE_LIST.map((t) => [t.code, String(t.price)])),
    });
  }, [state, form]);

  if (!form || !state) return null;
  const readOnly = !allows("settings.edit");

  async function save() {
    if (!form) return;
    const parsed = settingsSchema.safeParse({
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      capacity: Number(form.capacity),
      projectedRevenue: Number(form.projectedRevenue),
      rules: {
        ...form.rules,
        doorsOpenMinutesBefore: Number(form.rules.doorsOpenMinutesBefore),
        entryClosesMinutesAfter: Number(form.rules.entryClosesMinutesAfter),
        refundWindowHours: Number(form.rules.refundWindowHours),
      },
      prices: Object.fromEntries(Object.entries(form.prices).map(([k, v]) => [k, Number(v)])),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      setConfirming(false);
      toast.push({ tone: "error", title: "Check the form", body: "Some settings are not valid." });
      return;
    }
    setBusy(true);
    try {
      await apiSend("/api/settings", parsed.data, "PATCH");
      toast.push({ tone: "success", title: "Event settings saved", body: "Changes apply to the gate immediately." });
      setErrors({});
      setConfirming(false);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields ?? {});
      toast.push({ tone: "error", title: "Could not save", body: err instanceof Error ? err.message : "" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACL Configuration"
        title="Event Settings"
        description="Event details, ticket pricing, gate rules and refund policy. Changes take effect at the gate on the next scan."
        actions={
          !readOnly ? (
            <Button variant="primary" onClick={() => setConfirming(true)}>
              <Save className="h-3.5 w-3.5" />
              Save changes
            </Button>
          ) : (
            <Badge tone="neutral">Read only</Badge>
          )
        }
      />

      <div className="space-y-3 p-3 sm:p-4 lg:p-5">
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Event Details" icon={<SettingsIcon className="h-3.5 w-3.5" />} />
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <Field label="Event name" required error={errors.name} className="sm:col-span-2">
                <Input value={form.name} disabled={readOnly} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={Boolean(errors.name)} />
              </Field>
              <Field label="Date & time" required error={errors.startsAt}>
                <Input type="datetime-local" value={form.startsAt} disabled={readOnly} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </Field>
              <Field label="Status" required>
                <Select value={form.status} disabled={readOnly} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}>
                  {(["DRAFT", "ON_SALE", "LIVE", "COMPLETED", "CANCELLED"] as const).map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Venue" required error={errors.venue}>
                <Input value={form.venue} disabled={readOnly} onChange={(e) => setForm({ ...form, venue: e.target.value })} invalid={Boolean(errors.venue)} />
              </Field>
              <Field label="Location" required error={errors.location}>
                <Input value={form.location} disabled={readOnly} onChange={(e) => setForm({ ...form, location: e.target.value })} invalid={Boolean(errors.location)} />
              </Field>
              <Field label="Capacity" required error={errors.capacity}>
                <Input type="number" value={form.capacity} disabled={readOnly} onChange={(e) => setForm({ ...form, capacity: e.target.value })} invalid={Boolean(errors.capacity)} />
              </Field>
              <Field label="Projected revenue (₦)" required error={errors.projectedRevenue}>
                <Input type="number" value={form.projectedRevenue} disabled={readOnly} onChange={(e) => setForm({ ...form, projectedRevenue: e.target.value })} />
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Ticket Pricing" subtitle="Applies to tickets sold from now on" />
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {TICKET_TYPE_LIST.map((tier) => (
                <Field key={tier.code} label={`${tier.name} (₦)`} error={errors[`prices.${tier.code}`]}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-[1px]" style={{ background: TYPE_COLOR[tier.code] }} />
                    <Input
                      type="number"
                      value={form.prices[tier.code]}
                      disabled={readOnly}
                      onChange={(e) => setForm({ ...form, prices: { ...form.prices, [tier.code]: e.target.value } })}
                    />
                  </div>
                </Field>
              ))}
              <p className="text-[11px] leading-relaxed text-ink-4 sm:col-span-2">
                Current inventory value at these prices:{" "}
                <span className="font-mono text-ink-2">
                  {formatNaira(TICKET_TYPE_LIST.reduce((s, t) => s + (Number(form.prices[t.code]) || 0) * t.allocation, 0))}
                </span>
              </p>
            </div>
          </Panel>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Gate & Ticket Rules" icon={<DoorOpen className="h-3.5 w-3.5" />} />
            <div className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Doors open (mins before)" error={errors["rules.doorsOpenMinutesBefore"]}>
                  <Input
                    type="number"
                    value={form.rules.doorsOpenMinutesBefore}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, rules: { ...form.rules, doorsOpenMinutesBefore: e.target.value } })}
                  />
                </Field>
                <Field label="Entry closes (mins after)" error={errors["rules.entryClosesMinutesAfter"]}>
                  <Input
                    type="number"
                    value={form.rules.entryClosesMinutesAfter}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, rules: { ...form.rules, entryClosesMinutesAfter: e.target.value } })}
                  />
                </Field>
                <Field label="Refund window (hours before)" error={errors["rules.refundWindowHours"]} className="sm:col-span-2">
                  <Input
                    type="number"
                    value={form.rules.refundWindowHours}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, rules: { ...form.rules, refundWindowHours: e.target.value } })}
                  />
                </Field>
              </div>
              <div className="mt-2">
                <Toggle
                  checked={form.rules.singleUseTickets}
                  onChange={(v) => !readOnly && setForm({ ...form, rules: { ...form.rules, singleUseTickets: v } })}
                  label="Single-use tickets"
                  description="A ticket admits exactly once. Turning this off is never recommended for a live gate."
                />
                <Toggle
                  checked={form.rules.allowPendingPaymentOverride}
                  onChange={(v) => !readOnly && setForm({ ...form, rules: { ...form.rules, allowPendingPaymentOverride: v } })}
                  label="Allow pending-payment override"
                  description="Lets a supervisor admit an unsettled ticket. Every override is written to the security log."
                />
              </div>
              <div className="mt-3">
                <p className="acl-label mb-2">Gates</p>
                <ul className="space-y-1.5">
                  {state.gates.map((gate) => (
                    <li key={gate.id} className="flex items-center justify-between rounded-[3px] border border-hairline bg-surface-2 px-3 py-2">
                      <span className="text-[12.5px] text-ink">{gate.name}</span>
                      <span className="text-[11px] text-ink-4">
                        {gate.allowedTypes.length ? gate.allowedTypes.join(", ") : "All tiers"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Refund Policy" />
            <div className="p-4">
              <Field label="Policy text" error={errors.refundPolicy}>
                <Textarea
                  value={form.refundPolicy}
                  disabled={readOnly}
                  rows={6}
                  onChange={(e) => setForm({ ...form, refundPolicy: e.target.value })}
                  className="min-h-[140px]"
                />
              </Field>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-4">
                Shown on e-tickets and the public checkout. Refunds themselves are executed from the Payments and
                Attendees screens, and always require a reason.
              </p>
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHeader
            title="Staff Permissions"
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            subtitle="What each role can do. Enforced on every API route, not just in the interface."
          />
          <DataTable>
            <thead>
              <tr>
                <Th>Permission</Th>
                {ROLES.map((role) => (
                  <Th key={role} align="center">
                    {ROLE_LABEL[role]}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <Tr key={permission}>
                  <Td mono className="text-ink-2">{permission}</Td>
                  {ROLES.map((role) => (
                    <Td key={role} align="center">
                      {ROLE_PERMISSIONS[role].includes(permission) ? (
                        <span className="text-ok" aria-label="allowed">
                          ●
                        </span>
                      ) : (
                        <span className="text-ink-4" aria-label="denied">
                          —
                        </span>
                      )}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={save}
        title="Save event settings?"
        body="These settings drive the gate. Changing status, capacity, pricing or ticket rules affects check-in and sales immediately."
        confirmLabel="Save settings"
        tone="primary"
        loading={busy}
      />
    </>
  );
}
