"use client";

import { useState } from "react";
import { Check, Crown, Ticket as TicketIcon } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, Th, Td, Tr, Skeleton } from "@/components/ui/Table";
import { SellTicketModal } from "@/components/ticketing/SellTicketModal";
import { useAcl } from "@/lib/client/provider";
import { TICKET_TYPE_LIST, TYPE_COLOR } from "@/lib/domain/catalog";
import { formatNaira, formatNumber } from "@/lib/domain/format";
import type { TicketTypeCode } from "@/lib/domain/types";

export default function TicketingPage() {
  return (
    <Guard permission="ticketing.view">
      <Ticketing />
    </Guard>
  );
}

function Ticketing() {
  const { state, allows } = useAcl();
  const [selected, setSelected] = useState<TicketTypeCode | undefined>();
  const [open, setOpen] = useState(false);

  function openCheckout(type: TicketTypeCode) {
    setSelected(type);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="ACL Ticketing"
        title="Sell Tickets"
        description="Issue admission for Lion's Den: The First Roar. Every ticket is minted server-side with a signed, single-use QR credential."
        actions={
          allows("ticketing.sell") ? (
            <Button variant="primary" onClick={() => setOpen(true)}>
              <TicketIcon className="h-3.5 w-3.5" />
              New sale
            </Button>
          ) : null
        }
      />

      <div className="space-y-3 p-3 sm:p-4 lg:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TICKET_TYPE_LIST.map((tier) => {
            const row = state?.breakdown.find((b) => b.type === tier.code);
            const sold = row?.sold ?? 0;
            const remaining = row?.remaining ?? tier.allocation;
            const soldOut = remaining <= 0;
            const fill = tier.allocation ? (sold / tier.allocation) * 100 : 0;

            return (
              <Panel
                key={tier.code}
                className={`flex flex-col ${tier.premium ? "border-gold/25" : ""}`}
              >
                <div
                  className="h-[3px] w-full"
                  style={{ background: `linear-gradient(90deg, ${TYPE_COLOR[tier.code]}, transparent)` }}
                />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {tier.premium ? <Crown className="h-3.5 w-3.5 text-gold" /> : null}
                        <h3
                          className={`font-display text-[15px] font-extrabold uppercase tracking-[0.04em] ${
                            tier.premium ? "text-gold" : "text-ink"
                          }`}
                        >
                          {tier.name}
                        </h3>
                      </div>
                      <p className="acl-stat mt-1.5 text-[24px] leading-none text-ink">{formatNaira(tier.price)}</p>
                    </div>
                    {soldOut ? (
                      <Badge tone="danger">Sold out</Badge>
                    ) : (
                      <Badge tone={tier.premium ? "gold" : "neutral"}>{formatNumber(remaining)} left</Badge>
                    )}
                  </div>

                  <p className="mt-2.5 text-[12px] leading-relaxed text-ink-3">{tier.description}</p>

                  <ul className="mt-3 space-y-1.5">
                    {tier.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-1.5 text-[11.5px] text-ink-2">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-ok" />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-ink-4">
                      <span>
                        {formatNumber(sold)} / {formatNumber(tier.allocation)} sold
                      </span>
                      <span>{fill.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#1B1F26]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, fill)}%`, background: TYPE_COLOR[tier.code] }}
                      />
                    </div>
                    <Button
                      variant={tier.premium ? "gold" : "primary"}
                      size="md"
                      className="mt-3 w-full"
                      disabled={soldOut || !allows("ticketing.sell")}
                      onClick={() => openCheckout(tier.code)}
                    >
                      {soldOut ? "Sold out" : `Sell ${tier.name}`}
                    </Button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>

        <Panel>
          <PanelHeader title="Sales by Ticket Type" subtitle="Revenue is computed from the ticket rows, never entered" />
          <DataTable>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th align="right">Price</Th>
                <Th align="right">Allocation</Th>
                <Th align="right">Sold</Th>
                <Th align="right">Remaining</Th>
                <Th align="right">Checked In</Th>
                <Th align="right">Revenue</Th>
              </tr>
            </thead>
            <tbody>
              {state ? (
                <>
                  {state.breakdown.map((row) => (
                    <Tr key={row.type}>
                      <Td>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-[1px]" style={{ background: TYPE_COLOR[row.type] }} />
                          <span className="text-ink">{row.name}</span>
                        </span>
                      </Td>
                      <Td align="right" mono>{formatNaira(row.price)}</Td>
                      <Td align="right" mono>{formatNumber(row.allocation)}</Td>
                      <Td align="right" mono>{formatNumber(row.sold)}</Td>
                      <Td align="right" mono>{formatNumber(row.remaining)}</Td>
                      <Td align="right" mono>{formatNumber(row.checkedIn)}</Td>
                      <Td align="right" mono className="text-ok">{formatNaira(row.revenue)}</Td>
                    </Tr>
                  ))}
                  <Tr className="bg-surface-2/60">
                    <Td className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink">Total</Td>
                    <Td />
                    <Td align="right" mono className="text-ink">
                      {formatNumber(state.breakdown.reduce((s, r) => s + r.allocation, 0))}
                    </Td>
                    <Td align="right" mono className="text-ink">{formatNumber(state.stats.ticketsSold)}</Td>
                    <Td align="right" mono className="text-ink">
                      {formatNumber(state.breakdown.reduce((s, r) => s + r.remaining, 0))}
                    </Td>
                    <Td align="right" mono className="text-ink">{formatNumber(state.stats.checkedIn)}</Td>
                    <Td align="right" mono className="font-semibold text-ok">{formatNaira(state.stats.revenue)}</Td>
                  </Tr>
                </>
              ) : (
                Array.from({ length: 6 }).map((_, i) => (
                  <Tr key={i}>
                    <Td colSpan={7}>
                      <Skeleton className="h-3 w-full" />
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </DataTable>
        </Panel>
      </div>

      <SellTicketModal open={open} onClose={() => setOpen(false)} initialType={selected} />
    </>
  );
}
