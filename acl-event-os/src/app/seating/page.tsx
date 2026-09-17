"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Crown, Grid3x3, Lock, Users } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge, PaymentBadge } from "@/components/ui/Badge";
import { Skeleton, EmptyState } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { SeatingMap, SectionDetail, SeatingLegend, type SectionOccupancy } from "@/components/seating/SeatingMap";
import { TableBookingModal } from "@/components/seating/TableBookingModal";
import { useAcl } from "@/lib/client/provider";
import { useResource } from "@/lib/client/useResource";
import { apiSend } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { TICKET_TYPES } from "@/lib/domain/catalog";
import { formatNaira, formatNumber } from "@/lib/domain/format";
import type { EventTable, SeatSectionCode } from "@/lib/domain/types";

interface SeatingData {
  sections: SectionOccupancy[];
  capacity: number;
  seated: number;
  available: number;
  tables: EventTable[];
}

export default function SeatingPage() {
  return (
    <Guard permission="seating.view">
      <Suspense fallback={null}>
        <Seating />
      </Suspense>
    </Guard>
  );
}

function Seating() {
  const searchParams = useSearchParams();
  const { allows, refresh } = useAcl();
  const toast = useToast();
  const { data, loading } = useResource<SeatingData>("/api/seating");
  const [selected, setSelected] = useState<SeatSectionCode | null>(null);
  const [booking, setBooking] = useState<EventTable | null>(null);
  const [holding, setHolding] = useState<EventTable | null>(null);
  const [holdNote, setHoldNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get("book") && data?.tables.length && !booking) {
      const free = data.tables.find((t) => !t.ticketId && !t.reserved);
      if (free) setBooking(free);
    }
  }, [searchParams, data?.tables, booking]);

  const section = data?.sections.find((s) => s.code === selected) ?? null;

  async function toggleHold() {
    if (!holding) return;
    setBusy(true);
    try {
      await apiSend(`/api/tables/${holding.id}`, { note: holdNote || "Held by ACL operations" });
      toast.push({ tone: "success", title: holding.reserved ? "Hold released" : "Table held" });
      setHolding(null);
      setHoldNote("");
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
        eyebrow="ACL Venue"
        title="Seating & Tables"
        description="The 500-seat Indoor Arena floor plan. Select a block for occupancy and revenue, or manage table bookings."
      />

      <div className="space-y-3 p-3 sm:p-4 lg:p-5">
        {loading && !data ? (
          <Panel className="p-4">
            <Skeleton className="aspect-[5/4] w-full" />
          </Panel>
        ) : data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Arena capacity" value={formatNumber(data.capacity)} sub="Seats across all blocks" />
              <Stat label="Seats committed" value={formatNumber(data.seated)} sub={`${((data.seated / data.capacity) * 100).toFixed(0)}% of the floor`} tone="text-acl-red-bright" />
              <Stat label="Seats available" value={formatNumber(data.available)} sub="Still on sale" tone="text-ok" />
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Panel>
                  <PanelHeader
                    title="Arena Map"
                    icon={<Grid3x3 className="h-3.5 w-3.5" />}
                    subtitle="Select a block to inspect it"
                  />
                  <div className="p-3">
                    <SeatingMap sections={data.sections} selected={selected} onSelect={setSelected} />
                    <div className="mt-3">
                      <SeatingLegend sections={data.sections} />
                    </div>
                  </div>
                </Panel>
              </div>

              <Panel>
                <PanelHeader title={section ? section.name : "Block Detail"} subtitle={section ? undefined : "Nothing selected"} />
                <div className="p-4">
                  {section ? (
                    <div className="space-y-4">
                      <SectionDetail section={section} />
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-4">
                          <span>Occupancy</span>
                          <span>{((section.sold / section.capacity) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#1B1F26]">
                          <div
                            className="h-full rounded-full bg-acl-red transition-all duration-700"
                            style={{ width: `${Math.min(100, (section.sold / section.capacity) * 100)}%` }}
                          />
                        </div>
                      </div>
                      {section.ticketType && section.seatsPerTicket > 1 ? (
                        <p className="text-[11.5px] leading-relaxed text-ink-3">
                          {section.tickets} of {section.capacity / section.seatsPerTicket} tables sold — each seats{" "}
                          {section.seatsPerTicket}.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyState
                      title="Select a block"
                      body="Click any coloured block on the map to see capacity, sales, revenue and check-in progress."
                      icon={<Grid3x3 className="h-5 w-5" />}
                    />
                  )}
                </div>
              </Panel>
            </div>

            <Panel>
              <PanelHeader
                title="Table Management"
                icon={<Crown className="h-3.5 w-3.5" />}
                subtitle="Executive and Royal tables — buyer, guest list and gate status"
              />
              <div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.tables.map((table) => {
                  const def = TICKET_TYPES[table.type];
                  const sold = Boolean(table.ticketId);
                  const checkedIn = table.guests.filter((g) => g.checkedIn).length;

                  return (
                    <div
                      key={table.id}
                      className={`flex flex-col rounded-[3px] border p-3 ${
                        sold ? "border-gold/30 bg-gold/[0.04]" : table.reserved ? "border-warn/35 bg-warn/[0.04]" : "border-hairline-strong bg-surface-2"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-display text-[13px] font-extrabold uppercase tracking-[0.04em] ${table.type === "ROYAL" ? "text-gold" : "text-ink"}`}>
                            {table.label}
                          </p>
                          <p className="font-mono text-[11px] text-ink-4">{table.id}</p>
                        </div>
                        {sold ? (
                          <PaymentBadge status={table.paymentStatus ?? "PAID"} />
                        ) : table.reserved ? (
                          <Badge tone="warn">Held</Badge>
                        ) : (
                          <Badge tone="neutral">Available</Badge>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center gap-3 text-[11.5px] text-ink-3">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {table.capacity} seats
                        </span>
                        <span className="font-mono text-ink-2">{formatNaira(def.price)}</span>
                      </div>

                      {sold ? (
                        <>
                          <p className="mt-2.5 truncate text-[12.5px] text-ink">{table.buyerName}</p>
                          <p className="truncate font-mono text-[11px] text-ink-4">{table.buyerPhone}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1B1F26]">
                              <div className="h-full rounded-full bg-ok" style={{ width: `${(checkedIn / table.capacity) * 100}%` }} />
                            </div>
                            <span className="font-mono text-[10.5px] text-ink-3">
                              {checkedIn}/{table.capacity} in
                            </span>
                          </div>
                        </>
                      ) : table.reserved ? (
                        <p className="mt-2.5 text-[12px] text-warn">{table.reservedNote}</p>
                      ) : (
                        <p className="mt-2.5 text-[12px] text-ink-4">Not yet sold.</p>
                      )}

                      {!sold && allows("seating.reserve") ? (
                        <div className="mt-3 flex gap-1.5">
                          <Button size="sm" variant={table.type === "ROYAL" ? "gold" : "primary"} className="flex-1" onClick={() => setBooking(table)}>
                            Book
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setHolding(table)}>
                            <Lock className="h-3 w-3" />
                            {table.reserved ? "Release" : "Hold"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Panel>
          </>
        ) : null}
      </div>

      <TableBookingModal table={booking} onClose={() => setBooking(null)} />

      <Modal
        open={Boolean(holding)}
        onClose={() => setHolding(null)}
        title={holding?.reserved ? "Release this hold?" : "Hold this table"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setHolding(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={toggleHold} loading={busy}>
              {holding?.reserved ? "Release" : "Hold table"}
            </Button>
          </>
        }
      >
        {holding?.reserved ? (
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            {holding.label} goes back on sale immediately. The current note ({holding.reservedNote}) is cleared.
          </p>
        ) : (
          <Field label="Held for" required hint="Shown to anyone browsing the table list.">
            <Input value={holdNote} onChange={(e) => setHoldNote(e.target.value)} placeholder="Sponsor — Zenith" />
          </Field>
        )}
      </Modal>
    </>
  );
}

function Stat({ label, value, sub, tone = "text-ink" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <Panel className="p-3.5">
      <p className="acl-label">{label}</p>
      <p className={`acl-stat mt-1.5 text-[26px] leading-none ${tone}`}>{value}</p>
      <p className="mt-1.5 text-[11px] text-ink-4">{sub}</p>
    </Panel>
  );
}
