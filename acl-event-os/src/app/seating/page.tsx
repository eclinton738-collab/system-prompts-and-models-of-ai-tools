"use client";

import { Armchair, DoorOpen, Lock, LogOut, Unlock, Users, Wine } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOps } from "@/components/ops-provider";
import { Badge, Button, Field, Modal, PageHeader, Panel, PaymentBadge, Progress, TableWrap, useConfirm } from "@/components/ui";
import { useUi } from "@/components/ui-context";
import { cn } from "@/lib/cn";
import { naira, pct } from "@/lib/format";
import { byType } from "@/lib/metrics";
import { TYPE_COLOR } from "@/lib/theme";
import type { Seat, TableRecord, TicketTypeId } from "@/lib/types";

/** Venue geometry (viewBox 1000×680). A section may be drawn as several blocks. */
const BLOCKS: Record<TicketTypeId, { x: number; y: number; w: number; h: number }[]> = {
  GEN: [{ x: 30, y: 110, w: 105, h: 430 }, { x: 865, y: 110, w: 105, h: 430 }, { x: 155, y: 565, w: 690, h: 55 }],
  VIP: [{ x: 250, y: 490, w: 500, h: 55 }],
  VVIP: [{ x: 345, y: 420, w: 310, h: 50 }],
  EX: [{ x: 155, y: 150, w: 95, h: 320 }, { x: 750, y: 150, w: 95, h: 320 }],
  RY: [{ x: 270, y: 180, w: 85, h: 220 }, { x: 645, y: 180, w: 85, h: 220 }],
  RNG: [],
};
const octagon = (cx: number, cy: number, r: number) => Array.from({ length: 8 }, (_, i) => { const a = (Math.PI / 4) * i + Math.PI / 8; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
const SECTION_NAME: Record<TicketTypeId, string> = { GEN: "General Admission", VIP: "VIP", VVIP: "VVIP", RNG: "Ringside", EX: "Executive Tables", RY: "Royal Tables" };

export default function SeatingPage() {
  const { s, ix, can, call } = useOps();
  const { openSell, openTicket } = useUi();
  const confirm = useConfirm();
  const stats = useMemo(() => byType(s, ix), [s, ix]);
  const [sel, setSel] = useState<TicketTypeId>("VIP");
  const [picked, setPicked] = useState<string[]>([]);
  const [guestsFor, setGuestsFor] = useState<TableRecord | null>(null);
  const [guestText, setGuestText] = useState("");
  const [busy, setBusy] = useState(false);
  const manage = can("seating.manage");
  const stat = stats.find((x) => x.type.id === sel)!;
  const seats = useMemo(() => s.seats.filter((x) => x.typeId === sel), [s.seats, sel]);
  const pickedSeats = picked.map((id) => ix.seat.get(id)).filter((x): x is Seat => !!x);
  const pickedFree = pickedSeats.filter((x) => x.status === "AVAILABLE");
  const pickedHeld = pickedSeats.filter((x) => x.status === "RESERVED");

  const select = (id: TicketTypeId) => { setSel(id); setPicked([]); };
  const toggle = (seat: Seat) => {
    if (seat.status === "SOLD") { if (seat.ticketId) openTicket(seat.ticketId); return; }
    if (!manage) return;
    setPicked((p) => (p.includes(seat.id) ? p.filter((x) => x !== seat.id) : [...p, seat.id]));
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast.success(ok); setPicked([]); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  async function reserve(ids: string[]) {
    const r = await confirm({ title: `Reserve ${ids.length} ${stat.type.isTable ? "table" : "seat"}${ids.length > 1 ? "s" : ""}?`, confirmLabel: "Reserve", reason: { label: "Held for", placeholder: "e.g. Sponsor allocation" }, body: <>Reserved inventory is taken off sale until an admin releases it.</> });
    if (r.ok) await act(() => call("seats.reserve", { seatIds: ids, note: r.reason }), "Reserved");
  }
  const release = (ids: string[]) => act(() => call("seats.release", { seatIds: ids }), "Released back to sale");

  const section = (id: TicketTypeId, children: React.ReactNode) => {
    const st = stats.find((x) => x.type.id === id)!; const active = sel === id; const fill = 0.14 + 0.5 * (st.capacity ? (st.capacity - st.available) / st.capacity : 0);
    return (
      <g key={id} role="button" tabIndex={0} aria-pressed={active} aria-label={`${SECTION_NAME[id]}: ${st.sold} sold of ${st.capacity}, ${st.available} available`} className="cursor-pointer outline-none [&:focus-visible_.shape]:stroke-white"
        onClick={() => select(id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(id); } }}
        style={{ ["--c" as string]: TYPE_COLOR[id] }}>
        <g fill={TYPE_COLOR[id]} fillOpacity={fill} stroke={active ? "#fff" : TYPE_COLOR[id]} strokeWidth={active ? 3 : 1.5} className="transition-all hover:brightness-125">{children}</g>
      </g>
    );
  };
  const label = (id: TicketTypeId, x: number, y: number, vertical?: boolean) => {
    const st = stats.find((v) => v.type.id === id)!;
    return (
      <g key={`${id}-${x}`} pointerEvents="none" transform={vertical ? `rotate(-90 ${x} ${y})` : undefined} textAnchor="middle">
        <text x={x} y={y - 2} fill="#fff" fontSize="15" fontWeight="700" letterSpacing="2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>{SECTION_NAME[id]}</text>
        <text x={x} y={y + 15} fill="#d7dae0" fontSize="12" style={{ fontVariantNumeric: "tabular-nums" }}>{st.sold}/{st.capacity} sold</text>
      </g>
    );
  };

  return (
    <div>
      <PageHeader title="Seating & Tables" subtitle={`${s.seats.length}-capacity floor plan. Select a section for live inventory; reserve seats or book tables directly from the map.`}>
        {can("tickets.sell") && <Button variant="gold" onClick={() => openSell({ mode: "table" })}><Wine className="h-4 w-4" />Create Table Booking</Button>}
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel title="Arena Map" eyebrow={`${s.event.venue} · ${s.event.location}`} action={<span className="text-xs text-fg-dim">Shading shows how full a section is</span>}>
          <svg viewBox="0 0 1000 680" className="theme-dark h-auto w-full select-none" role="group" aria-label="Interactive seating map">
            <rect x="8" y="8" width="984" height="664" fill="#0b0c0f" stroke="#262a32" strokeWidth="2" />
            {/* Stage / walkout */}
            <rect x="330" y="22" width="340" height="52" fill="#1c1f25" stroke="#363b45" />
            <text x="500" y="54" textAnchor="middle" fill="#a3a9b4" fontSize="16" fontWeight="700" letterSpacing="6" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>STAGE · WALKOUT</text>
            <path d="M470 74 L470 210 M530 74 L530 210" stroke="#363b45" strokeDasharray="5 6" />
            {section("GEN", BLOCKS.GEN.map((b, i) => <rect key={i} className="shape" {...{ x: b.x, y: b.y, width: b.w, height: b.h }} />))}
            {section("EX", BLOCKS.EX.map((b, i) => <rect key={i} className="shape" {...{ x: b.x, y: b.y, width: b.w, height: b.h }} />))}
            {section("RY", BLOCKS.RY.map((b, i) => <rect key={i} className="shape" {...{ x: b.x, y: b.y, width: b.w, height: b.h }} />))}
            {section("VVIP", BLOCKS.VVIP.map((b, i) => <rect key={i} className="shape" {...{ x: b.x, y: b.y, width: b.w, height: b.h }} />))}
            {section("VIP", BLOCKS.VIP.map((b, i) => <rect key={i} className="shape" {...{ x: b.x, y: b.y, width: b.w, height: b.h }} />))}
            {section("RNG", <path className="shape" fillRule="evenodd" d={`M${octagon(500, 290, 128).replaceAll(" ", " L")} Z M${octagon(500, 290, 88).replaceAll(" ", " L")} Z`} />)}
            {/* The cage */}
            <polygon points={octagon(500, 290, 78)} fill="#15171b" stroke="#E11D2E" strokeWidth="3" />
            <polygon points={octagon(500, 290, 58)} fill="none" stroke="#E11D2E" strokeOpacity="0.35" />
            <text x="500" y="287" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="700" letterSpacing="4" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>ACL</text>
            <text x="500" y="305" textAnchor="middle" fill="#a3a9b4" fontSize="11" letterSpacing="3">THE CAGE</text>
            {label("GEN", 82, 325, true)}{label("GEN", 918, 325, true)}{label("GEN", 500, 592)}
            {label("EX", 202, 310, true)}{label("EX", 798, 310, true)}
            {label("RY", 312, 290, true)}{label("RY", 688, 290, true)}
            {label("VVIP", 500, 445)}{label("VIP", 500, 517)}
            <g pointerEvents="none" textAnchor="middle"><text x="500" y="178" fill="#fff" fontSize="13" fontWeight="700" letterSpacing="2" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>RINGSIDE</text><text x="500" y="193" fill="#d7dae0" fontSize="11">{stats.find((x) => x.type.id === "RNG")!.sold}/{stats.find((x) => x.type.id === "RNG")!.capacity} sold</text></g>
            {/* Doors */}
            <g fontSize="13" fontWeight="700" letterSpacing="3" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
              <rect x="410" y="640" width="180" height="26" fill="#2EBD73" /><text x="500" y="658" textAnchor="middle" fill="#07080A">ENTRANCE</text>
              <rect x="30" y="30" width="105" height="26" fill="none" stroke="#F0A020" /><text x="82" y="48" textAnchor="middle" fill="#F0A020">EXIT</text>
              <rect x="865" y="30" width="105" height="26" fill="none" stroke="#F0A020" /><text x="918" y="48" textAnchor="middle" fill="#F0A020">EXIT</text>
            </g>
          </svg>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
            {stats.map((x) => <button key={x.type.id} type="button" onClick={() => select(x.type.id)} className={cn("flex items-center gap-1.5 hover:text-fg", sel === x.type.id && "text-fg")}><span className="h-2.5 w-2.5" style={{ background: TYPE_COLOR[x.type.id] }} />{SECTION_NAME[x.type.id]}</button>)}
            <span className="flex items-center gap-1.5"><DoorOpen className="h-3.5 w-3.5 text-ok" />Entrance</span><span className="flex items-center gap-1.5"><LogOut className="h-3.5 w-3.5 text-warn" />Exit</span>
          </div>
        </Panel>

        <Panel title={SECTION_NAME[sel]} eyebrow="Selected section" tone={stat.type.tier === "elite" ? "gold" : undefined} action={<span className="h-3 w-3" style={{ background: TYPE_COLOR[sel] }} />}>
          <dl className="grid grid-cols-2 gap-2">
            {([["Capacity", stat.capacity.toLocaleString()], ["Sold", stat.sold.toLocaleString()], ["Available", stat.available.toLocaleString()], ["Revenue", naira(stat.revenue)]] as const).map(([k, v]) => <div key={k} className="border border-ink-600 bg-ink-900 p-3"><dt className="eyebrow">{k}</dt><dd className="mt-1 truncate text-xl font-semibold tabular-nums">{v}</dd></div>)}
          </dl>
          <div className="mt-3 flex items-center gap-2"><Progress value={stat.sold / stat.capacity} tone={stat.type.tier === "standard" ? "acl" : "gold"} label="Sell-through" /><span className="w-10 text-right text-xs tabular-nums text-fg-dim">{pct(stat.sold, stat.capacity)}%</span></div>
          <p className="mt-2 text-xs text-fg-dim">{naira(stat.type.price)} {stat.type.isTable ? `per table of ${stat.type.guestsPerUnit}` : "per seat"} · {stat.reserved} reserved · {stat.pending} awaiting payment · {stat.checkedIn} checked in</p>

          <div className="mt-4 border-t border-ink-600 pt-4">
            <div className="mb-2 flex items-center justify-between"><span className="eyebrow">{stat.type.isTable ? "Tables" : "Seats"}</span>
              <span className="flex items-center gap-3 text-[11px] text-fg-dim"><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 border border-ink-500" />Free</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 bg-warn" />Held</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5" style={{ background: TYPE_COLOR[sel] }} />Sold</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 bg-ok" />In</span></span>
            </div>
            <div className={cn("grid max-h-[300px] gap-1 overflow-y-auto pr-1", stat.type.isTable ? "grid-cols-4" : "grid-cols-[repeat(20,minmax(0,1fr))]")}>
              {seats.map((seat) => {
                const t = seat.ticketId ? ix.ticket.get(seat.ticketId) : undefined; const isIn = t?.status === "USED"; const on = picked.includes(seat.id);
                const title = `${seat.label} — ${seat.status === "SOLD" ? `${t ? ix.attendee.get(t.attendeeId)?.name : "sold"}${isIn ? " (checked in)" : ""}` : seat.status === "RESERVED" ? `held for ${seat.reservedFor}` : "available"}`;
                return (
                  <button key={seat.id} type="button" title={title} aria-label={title} aria-pressed={seat.status === "SOLD" ? undefined : on} onClick={() => toggle(seat)}
                    className={cn("flex items-center justify-center border text-[10px] font-semibold tabular-nums transition", stat.type.isTable ? "aspect-[4/3]" : "aspect-square",
                      seat.status === "AVAILABLE" && "border-ink-500 text-fg-dim hover:border-fg", seat.status === "RESERVED" && "border-warn bg-warn/80 text-ink-950", seat.status === "SOLD" && !isIn && "border-transparent text-white", isIn && "border-ok bg-ok text-ink-950", on && "ring-2 ring-white ring-offset-1 ring-offset-ink-850", !manage && seat.status !== "SOLD" && "cursor-default")}
                    style={seat.status === "SOLD" && !isIn ? { background: TYPE_COLOR[sel] } : undefined}>
                    {stat.type.isTable ? seat.label.replace(/\D+/g, "") : ""}
                  </button>
                );
              })}
            </div>
            {manage ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" disabled={pickedFree.length === 0 || pickedHeld.length > 0} loading={busy} onClick={() => reserve(pickedFree.map((x) => x.id))}><Lock className="h-3.5 w-3.5" />Reserve {pickedFree.length || ""}</Button>
                <Button size="sm" disabled={pickedHeld.length === 0 || pickedFree.length > 0} onClick={() => release(pickedHeld.map((x) => x.id))}><Unlock className="h-3.5 w-3.5" />Release {pickedHeld.length || ""}</Button>
                {picked.length > 0 ? <Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button> : <span className="text-xs text-fg-dim">Click free seats to reserve, held seats to release, sold seats to open the ticket.</span>}
              </div>
            ) : <p className="mt-3 text-xs text-fg-dim">View only — your role cannot reserve seats.</p>}
            {can("tickets.sell") && <Button className="mt-3 w-full" variant={stat.type.tier === "elite" ? "gold" : "secondary"} disabled={stat.available === 0} onClick={() => openSell({ typeId: sel, mode: stat.type.isTable ? "table" : "sell" })}>{stat.available === 0 ? "Sold out" : stat.type.isTable ? `Book ${stat.type.shortName} table` : `Sell ${stat.type.shortName}`}</Button>}
          </div>
        </Panel>
      </div>

      <Panel title="Table Management" eyebrow="Executive ₦250,000 · Royal ₦500,000" className="mt-4" bodyClassName="p-0" tone="gold">
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Table ID</th><th>Table</th><th className="num">Capacity</th><th>Buyer</th><th>Guest list</th><th className="num">Price</th><th>Payment</th><th>Check-in</th><th className="num">Actions</th></tr></thead>
            <tbody>
              {s.tables.map((t) => {
                const seat = ix.seat.get(t.seatId)!; const ticket = t.ticketId ? ix.ticket.get(t.ticketId) : undefined; const payment = ticket && ix.payment.get(ticket.paymentId); const type = ix.type.get(t.typeId)!;
                return (
                  <tr key={t.id}>
                    <td className="ticket-id">{ticket?.id ?? <span className="text-fg-dim">—</span>}</td>
                    <td><span className="flex items-center gap-2"><span className="h-2 w-2" style={{ background: TYPE_COLOR[t.typeId] }} />{t.label}</span></td>
                    <td className="num text-fg-muted">{t.capacity}</td>
                    <td className="max-w-[200px] truncate font-medium">{t.buyer ?? (seat.status === "RESERVED" ? <span className="font-normal text-warn">Held · {seat.reservedFor}</span> : <span className="font-normal text-fg-dim">Available</span>)}</td>
                    <td className="max-w-[220px] truncate text-fg-muted" title={t.guests.join(", ")}>{ticket ? <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-fg-dim" />{t.guests.length}/{t.capacity}{t.guests.length > 0 && <span className="truncate text-fg-dim"> · {t.guests.join(", ")}</span>}</span> : "—"}</td>
                    <td className="num">{naira(ticket?.pricePaid ?? type.price)}</td>
                    <td>{payment ? <PaymentBadge status={payment.status} /> : <span className="text-fg-dim">—</span>}</td>
                    <td>{ticket ? (ticket.status === "USED" ? <Badge tone="ok" dot>Checked in</Badge> : <Badge>Not arrived</Badge>) : <span className="text-fg-dim">—</span>}</td>
                    <td className="num"><span className="inline-flex gap-1.5">
                      {ticket && <Button size="sm" variant="ghost" onClick={() => openTicket(ticket.id)}>View</Button>}
                      {ticket && manage && <Button size="sm" onClick={() => { setGuestsFor(t); setGuestText(t.guests.join("\n")); }}>Guests</Button>}
                      {!ticket && seat.status === "AVAILABLE" && can("tickets.sell") && <Button size="sm" variant="gold" onClick={() => openSell({ mode: "table", typeId: t.typeId, tableId: t.id })}>Book</Button>}
                      {!ticket && seat.status === "AVAILABLE" && manage && <Button size="sm" onClick={() => { setSel(t.typeId); reserve([t.id]); }}>Hold</Button>}
                      {!ticket && seat.status === "RESERVED" && manage && <Button size="sm" onClick={() => release([t.id])}>Release</Button>}
                    </span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <Modal open={!!guestsFor} onClose={() => setGuestsFor(null)} title="Guest list" description={guestsFor ? `${guestsFor.label} · ${guestsFor.buyer} · seats ${guestsFor.capacity}` : undefined} size="sm">
        {guestsFor && (() => { const list = guestText.split("\n").map((g) => g.trim()).filter(Boolean); const over = list.length > guestsFor.capacity; return (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (over) return; await act(() => call("tables.guests", { tableId: guestsFor.id, guests: list }), "Guest list saved"); setGuestsFor(null); }}>
            <Field label="Guests — one per line" error={over ? `This table seats ${guestsFor.capacity}` : undefined} hint={`${list.length} of ${guestsFor.capacity} places named`}>{(p) => <textarea {...p} className="input" rows={8} autoFocus value={guestText} onChange={(e) => setGuestText(e.target.value)} />}</Field>
            <div className="flex justify-end gap-2"><Button onClick={() => setGuestsFor(null)}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={over}><Armchair className="h-4 w-4" />Save guest list</Button></div>
          </form>
        ); })()}
      </Modal>
    </div>
  );
}
