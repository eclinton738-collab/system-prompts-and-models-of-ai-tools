"use client";

import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge, ResultBadge } from "@/components/ui/Badge";
import { DataTable, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { Scanner } from "@/components/checkin/Scanner";
import { CheckInAnalytics, SecurityFeed, GateBoard } from "@/components/dashboard/Panels";
import { CheckInFlowChart } from "@/components/charts/Charts";
import { useAcl } from "@/lib/client/provider";
import { formatTime, formatNumber } from "@/lib/domain/format";
import { TICKET_TYPES } from "@/lib/domain/catalog";

export default function CheckInPage() {
  return (
    <Guard permission="checkin.scan">
      <CheckIn />
    </Guard>
  );
}

function CheckIn() {
  const { state } = useAcl();

  return (
    <>
      <PageHeader
        eyebrow="ACL Gate Control"
        title="Live Check-In"
        description="Scan, validate and admit. Every scan is checked against the server record and written to the audit log — a ticket is admitted exactly once."
        actions={
          <Link
            href="/check-in/log"
            className="flex items-center gap-2 rounded-[3px] border border-hairline-strong bg-surface-2 px-3.5 py-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-2 transition-colors hover:border-acl-red/50 hover:text-ink"
          >
            Check-In Log <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-5 lg:p-5">
        <div className="lg:col-span-2">
          <Panel accent>
            <PanelHeader
              title="Live Check-In Scanner"
              icon={<ScanLine className="h-3.5 w-3.5" />}
              action={
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${state?.gatesOpen.open ? "bg-ok acl-live-dot" : "bg-warn"}`} />
                  <span className="font-display text-[9.5px] font-bold uppercase tracking-[0.12em] text-ok">
                    {state?.gatesOpen.open ? "Online" : "Standby"}
                  </span>
                </span>
              }
            />
            <div className="p-3">
              <Scanner />
            </div>
            {state ? <CheckInAnalytics stats={state.checkIn} checkedIn={state.stats.checkedIn} /> : null}
          </Panel>
        </div>

        <div className="space-y-3 lg:col-span-3">
          {state ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile label="Admitted" value={formatNumber(state.stats.checkedIn)} tone="text-ok" sub={`${state.stats.checkedInRate.toFixed(0)}% of tickets sold`} />
                <StatTile label="Refused" value={formatNumber(state.checkIn.rejected)} tone="text-danger" sub={`${state.checkIn.duplicates} duplicate attempts`} />
                <StatTile label="Awaiting" value={formatNumber(state.stats.awaitingCheckIn)} tone="text-warn" sub="Not yet through a gate" />
              </div>

              <Panel>
                <PanelHeader title="Gate Flow" subtitle="Admitted vs refused, last six hours" />
                <div className="p-3">
                  <CheckInFlowChart stats={state.checkIn} />
                </div>
              </Panel>

              <div className="grid gap-3 lg:grid-cols-2">
                <GateBoard stats={state.checkIn} />
                <SecurityFeed events={state.securityEvents} limit={5} />
              </div>

              <Panel>
                <PanelHeader
                  title="Recent Scans"
                  action={
                    <Link href="/check-in/log" className="flex items-center gap-1 font-display text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-3 hover:text-acl-red-bright">
                      Full log <ArrowRight className="h-3 w-3" />
                    </Link>
                  }
                />
                {state.recentScans.length === 0 ? (
                  <EmptyState title="No scans yet" body="Scans appear here the moment a ticket is presented." />
                ) : (
                  <DataTable>
                    <thead>
                      <tr>
                        <Th>Ticket ID</Th>
                        <Th>Name</Th>
                        <Th>Type</Th>
                        <Th>Gate</Th>
                        <Th>Result</Th>
                        <Th align="right">Time</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.recentScans.map((scan) => (
                        <Tr key={scan.id}>
                          <Td mono>{scan.ticketId}</Td>
                          <Td className="text-ink">{scan.attendeeName}</Td>
                          <Td>{scan.ticketType === "UNKNOWN" ? "—" : TICKET_TYPES[scan.ticketType].name}</Td>
                          <Td>{scan.gateName}</Td>
                          <Td>
                            <div className="flex items-center gap-1.5">
                              <ResultBadge result={scan.result} />
                              {scan.reason ? (
                                <Badge tone="neutral">{scan.reason.replace(/_/g, " ")}</Badge>
                              ) : null}
                            </div>
                          </Td>
                          <Td align="right" className="whitespace-nowrap text-ink-3">
                            {formatTime(scan.scannedAt)}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </DataTable>
                )}
              </Panel>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

function StatTile({ label, value, tone, sub }: { label: string; value: string; tone: string; sub: string }) {
  return (
    <Panel className="p-3.5">
      <p className={`acl-stat text-[26px] leading-none ${tone}`}>{value}</p>
      <p className="acl-label mt-1.5 !text-[9.5px]">{label}</p>
      <p className="mt-1.5 text-[11px] text-ink-4">{sub}</p>
    </Panel>
  );
}
