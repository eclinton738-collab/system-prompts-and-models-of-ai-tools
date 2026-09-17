"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, Copy, Fingerprint, Ban, FileWarning } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { useAcl } from "@/lib/client/provider";
import { downloadCsv } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatNumber } from "@/lib/domain/format";
import type { SecurityEventKind } from "@/lib/domain/types";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "DUPLICATE_SCAN", label: "Duplicate" },
  { value: "INVALID_TICKET", label: "Invalid" },
  { value: "FORGED_PAYLOAD", label: "Forged" },
  { value: "UNPAID_TICKET", label: "Unpaid" },
  { value: "WRONG_EVENT", label: "Wrong Event" },
] as const;

const SAFEGUARDS: Array<{ icon: React.ElementType; title: string; body: string }> = [
  {
    icon: Copy,
    title: "Screenshots & copied codes",
    body: "A QR is a credential, not a pass. The first successful scan marks the ticket USED; every later presentation — screenshot, photo or forward — is refused as a duplicate.",
  },
  {
    icon: Fingerprint,
    title: "Edited QR payloads",
    body: "Payloads are HMAC-signed. A code re-encoded off-platform fails the signature check before the database is even queried, and raises a critical event.",
  },
  {
    icon: Ban,
    title: "Fake ticket references",
    body: "Ticket IDs are minted server-side only. A reference that was never issued is rejected as TICKET_NOT_FOUND and logged against the gate that saw it.",
  },
  {
    icon: FileWarning,
    title: "Unpaid, refunded & wrong event",
    body: "Payment state and event binding are re-read from the live record at scan time, so a reversal or refund takes effect at the gate immediately.",
  },
];

export default function SecurityPage() {
  return (
    <Guard permission="security.view">
      <Security />
    </Guard>
  );
}

function Security() {
  const { state, allows } = useAcl();
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("ALL");

  const events = (state?.securityEvents ?? []).filter(
    (e) => filter === "ALL" || e.kind === (filter as SecurityEventKind),
  );
  const critical = (state?.securityEvents ?? []).filter((e) => e.severity === "CRITICAL").length;
  const duplicates = state?.checkIn.duplicates ?? 0;
  const refused = state?.checkIn.rejected ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="ACL Security"
        title="Security & Anti-Fraud"
        description="Every refused scan, why it was refused, and the gate, operator and device that saw it."
        actions={
          allows("reports.export") ? (
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv("/api/reports/security-events?format=csv", "acl-security-events.csv").catch(() =>
                  toast.push({ tone: "error", title: "Export failed" }),
                )
              }
            >
              Export events
            </Button>
          ) : null
        }
      />

      <div className="space-y-3 p-3 sm:p-4 lg:p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Critical events" value={formatNumber(critical)} tone="text-danger" icon={<ShieldAlert className="h-4 w-4" />} />
          <Stat label="Duplicate attempts" value={formatNumber(duplicates)} tone="text-acl-red-bright" icon={<Copy className="h-4 w-4" />} />
          <Stat label="Total refused" value={formatNumber(refused)} tone="text-warn" icon={<Ban className="h-4 w-4" />} />
          <Stat label="Clean admissions" value={formatNumber(state?.stats.checkedIn ?? 0)} tone="text-ok" icon={<ShieldCheck className="h-4 w-4" />} />
        </div>

        <Panel>
          <PanelHeader
            title="Security Events"
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            action={<Tabs size="sm" value={filter} onChange={setFilter} options={FILTERS as never} />}
          />
          {events.length === 0 ? (
            <EmptyState title="Nothing to report" body="No security events match this filter." icon={<ShieldCheck className="h-5 w-5" />} />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th align="right">Time</Th>
                  <Th>Event</Th>
                  <Th>Ticket</Th>
                  <Th>Gate</Th>
                  <Th>Operator</Th>
                  <Th>Device</Th>
                  <Th>Severity</Th>
                  <Th>Result</Th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <Tr key={event.id} className={event.severity === "CRITICAL" ? "bg-danger/[0.05]" : undefined}>
                    <Td align="right" mono className="whitespace-nowrap text-ink-3">{formatDateTime(event.at)}</Td>
                    <Td>
                      <span className="text-ink">
                        {event.kind.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                      </span>
                      <span className="mt-0.5 block max-w-md text-[11px] leading-relaxed text-ink-4">{event.detail}</span>
                      {event.firstScanAt ? (
                        <span className="mt-1 block text-[11px] text-danger">
                          First scanned {formatDateTime(event.firstScanAt)} · {event.firstScanGate} · {event.firstScanOperator}
                        </span>
                      ) : null}
                    </Td>
                    <Td mono>{event.ticketId}</Td>
                    <Td>{event.gateName}</Td>
                    <Td>{event.operatorName}</Td>
                    <Td mono className="text-ink-4">{event.deviceId}</Td>
                    <Td>
                      <SeverityBadge severity={event.severity} />
                    </Td>
                    <Td>
                      <Badge tone={event.result === "GRANTED" ? "ok" : "danger"}>{event.result}</Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Anti-Fraud Controls" subtitle="What the gate enforces, and how" />
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {SAFEGUARDS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="acl-inset p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-acl-red/30 bg-acl-red/10 text-acl-red-bright">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-2.5 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">{item.body}</p>
                </div>
              );
            })}
          </div>
          <div className="border-t border-hairline p-4">
            <p className="acl-label mb-2">Check-in transaction</p>
            <p className="max-w-3xl text-[12.5px] leading-relaxed text-ink-3">
              Admission runs inside a per-ticket lock and ends in a compare-and-set — the same guarantee as{" "}
              <code className="font-mono text-[11.5px] text-acl-red-bright">
                UPDATE tickets SET status=&apos;USED&apos; WHERE id=$1 AND status=&apos;VALID&apos;
              </code>
              . If two scanners present the same ticket at the same instant, one wins the row and the other is told
              it is a duplicate. Nothing inside the QR payload is trusted: the signature only buys a cheap
              rejection, and the live ticket record decides.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: React.ReactNode }) {
  return (
    <Panel className="p-3.5">
      <div className="flex items-start justify-between">
        <div>
          <p className={`acl-stat text-[26px] leading-none ${tone}`}>{value}</p>
          <p className="acl-label mt-1.5 !text-[9.5px]">{label}</p>
        </div>
        <span className={tone}>{icon}</span>
      </div>
    </Panel>
  );
}
