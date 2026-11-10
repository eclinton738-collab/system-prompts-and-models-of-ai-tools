"use client";

import { Check, Crown, Send, Ticket } from "lucide-react";
import { useMemo } from "react";
import { RecentSalesTable } from "@/components/features/widgets";
import { useOps } from "@/components/ops-provider";
import { Badge, Button, PageHeader, Progress } from "@/components/ui";
import { useUi } from "@/components/ui-context";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/format";
import { byType } from "@/lib/metrics";

export default function TicketingPage() {
  const { s, ix, can } = useOps();
  const { openSell, openSend } = useUi();
  const rows = useMemo(() => byType(s, ix), [s, ix]);
  const closed = !s.event.rules.salesOpen;
  return (
    <div>
      <PageHeader title="Ticketing" subtitle="Sell tickets and tables. Every sale issues a server-generated ticket ID and a signed, single-use QR code.">
        {can("tickets.send") && <Button onClick={() => openSend()}><Send className="h-4 w-4" />Send E-Ticket</Button>}
        <Button variant="primary" disabled={closed} onClick={() => openSell()}><Ticket className="h-4 w-4" />Sell Ticket</Button>
      </PageHeader>
      {closed && <p role="status" className="mb-4 border border-warn/50 bg-warn/10 p-3 text-sm text-warn">Ticket sales are closed in Event Settings. Re-open sales to sell.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ type: t, sold, capacity, available, reserved, pending }) => {
          const premium = t.tier !== "standard"; const elite = t.tier === "elite"; const out = available === 0;
          return (
            <article key={t.id} className={cn("panel group flex flex-col overflow-hidden", premium && "panel-gold")}>
              <div className={cn("relative px-5 pb-4 pt-5", elite && "arena")}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className={cn("h-display text-3xl", premium && "text-gold-light")}>{t.name}</h2>
                  {elite ? <Crown className="h-6 w-6 shrink-0 text-gold" aria-hidden /> : out ? <Badge tone="danger">Sold out</Badge> : available <= 5 ? <Badge tone="warn">{available} left</Badge> : null}
                </div>
                <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight">{naira(t.price)}</p>
                <p className="mt-1 text-xs text-fg-dim">{t.isTable ? `per table · seats ${t.guestsPerUnit}` : "per person"}</p>
              </div>
              <ul className="flex-1 space-y-1.5 border-t border-ink-600 px-5 py-4 text-sm text-fg-muted">
                {t.perks.map((p) => <li key={p} className="flex items-start gap-2"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", premium ? "text-gold" : "text-acl-glow")} />{p}</li>)}
              </ul>
              <div className="border-t border-ink-600 px-5 py-4">
                <div className="mb-1.5 flex justify-between text-xs"><span className="text-fg-muted"><span className="font-semibold text-fg">{sold}</span> sold of {capacity}</span><span className={cn("tabular-nums", out ? "text-danger" : "text-fg-dim")}>{available} available</span></div>
                <Progress value={sold / capacity} tone={premium ? "gold" : "acl"} label={`${t.name} sold`} />
                <p className="mt-1.5 min-h-4 text-[11px] text-fg-dim">{[reserved && `${reserved} held`, pending && `${pending} awaiting payment`].filter(Boolean).join(" · ")}</p>
                <Button variant={elite ? "gold" : "primary"} className="mt-3 w-full" disabled={out || closed} onClick={() => openSell({ typeId: t.id, mode: t.isTable ? "table" : "sell" })}>
                  {out ? "Sold out" : t.isTable ? "Book table" : `Sell ${t.shortName}`}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <RecentSalesTable className="mt-4" />
    </div>
  );
}
