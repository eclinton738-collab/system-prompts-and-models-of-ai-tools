"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { downloadFile } from "@/lib/csv";
import { date, naira, time } from "@/lib/format";
import type { Attendee, EventRecord, Ticket, TicketType } from "@/lib/types";
import { Logo } from "../shell/logo";

interface Props { ticket: Ticket; type: TicketType; attendee: Attendee; event: EventRecord; seatLabel?: string; className?: string }

/** The e-ticket as the customer sees it. The QR carries the server-signed token, never ticket details. */
export function ETicket({ ticket, type, attendee, event, seatLabel, className }: Props) {
  const premium = type.tier !== "standard";
  return (
    <div className={cn("theme-dark relative mx-auto w-full max-w-[340px] overflow-hidden border bg-ink-950", premium ? "border-gold/60" : "border-ink-500", className)}>
      <div className="arena px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <Logo compact />
          <span className={cn("slash px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.18em]", premium ? "bg-gold text-ink-950" : "bg-acl text-white")}>{type.name}</span>
        </div>
        <p className="h-display mt-5 text-[26px] leading-[0.95]">{event.name}</p>
        <p className="mt-2 text-xs text-fg-muted">{date(event.doorsOpenAt)} · Doors {time(event.doorsOpenAt)} · {event.venue}, {event.location}</p>
      </div>
      <div className="relative border-t border-dashed border-ink-500 px-5 py-4">
        <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border border-ink-500 bg-ink-800" aria-hidden />
        <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full border border-ink-500 bg-ink-800" aria-hidden />
        <div className="flex items-center gap-4">
          <div className="shrink-0 bg-white p-2">
            <QRCodeCanvas value={ticket.qrToken} size={116} level="M" marginSize={0} data-ticket-qr={ticket.id} aria-label={`QR code for ${ticket.id}`} />
          </div>
          <div className="min-w-0 space-y-2">
            <div><div className="eyebrow">Ticket</div><div className="ticket-id text-sm">{ticket.id}</div></div>
            <div><div className="eyebrow">Holder</div><div className="truncate text-sm font-medium">{attendee.name}</div></div>
            <div className="flex gap-4">
              <div><div className="eyebrow">Paid</div><div className="text-sm tabular-nums">{naira(ticket.pricePaid)}</div></div>
              {seatLabel && <div className="min-w-0"><div className="eyebrow">{type.isTable ? "Table" : "Seat"}</div><div className="truncate text-sm">{seatLabel}</div></div>}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-fg-dim">Admits {type.guestsPerUnit > 1 ? `one party of up to ${type.guestsPerUnit}` : "one"}. Single use — this code is void after the first scan. Do not share screenshots.</p>
      </div>
      <div className="bg-acl px-5 py-1.5 text-center font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-white">Unchained. Unbreakable. Unbound.</div>
    </div>
  );
}

/** Renders the e-ticket to a PNG the customer can keep on their phone. */
export async function downloadETicket({ ticket, type, attendee, event, seatLabel }: Props) {
  const qr = document.querySelector<HTMLCanvasElement>(`canvas[data-ticket-qr="${ticket.id}"]`);
  if (!qr) throw new Error("Open the ticket first so its QR code can be rendered.");
  await document.fonts?.ready;
  const W = 720, H = 1120;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const premium = type.tier !== "standard";
  g.fillStyle = "#08090b"; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, 620);
  glow.addColorStop(0, "rgba(225,29,46,0.55)"); glow.addColorStop(1, "rgba(225,29,46,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, 520);
  const text = (t: string, x: number, y: number, font: string, color = "#f4f5f7", align: CanvasTextAlign = "left") => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(t, x, y); };
  const D = "'Barlow Condensed', 'Arial Narrow', sans-serif", S = "Inter, system-ui, sans-serif", M = "'JetBrains Mono', monospace";
  text("ACL", 48, 92, `700 64px ${D}`, "#e11d2e");
  text("AFRICA COMBAT LEAGUE", 150, 74, `600 22px ${D}`);
  text("BORN TO BE GREAT", 150, 98, `600 15px ${D}`, "#a3a9b4");
  g.fillStyle = premium ? "#d4af37" : "#e11d2e"; g.fillRect(W - 48 - 220, 52, 220, 48);
  text(type.name.toUpperCase(), W - 48 - 110, 85, `700 26px ${D}`, premium ? "#08090b" : "#fff", "center");
  // Event title, wrapped.
  g.font = `700 68px ${D}`; g.textAlign = "left";
  const words = event.name.toUpperCase().split(" "); let line = ""; let y = 230;
  for (const w of words) { const next = line ? `${line} ${w}` : w; if (g.measureText(next).width > W - 96 && line) { text(line, 48, y, `700 68px ${D}`); line = w; y += 66; } else line = next; }
  text(line, 48, y, `700 68px ${D}`);
  text(`${date(event.doorsOpenAt)}  ·  Doors ${time(event.doorsOpenAt)}`, 48, y + 54, `500 24px ${S}`, "#a3a9b4");
  text(`${event.venue}, ${event.location}`, 48, y + 88, `500 24px ${S}`, "#a3a9b4");
  g.setLineDash([10, 10]); g.strokeStyle = "#363b45"; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 480); g.lineTo(W - 32, 480); g.stroke(); g.setLineDash([]);
  g.fillStyle = "#fff"; g.fillRect(W / 2 - 190, 520, 380, 380);
  g.imageSmoothingEnabled = false; g.drawImage(qr, W / 2 - 166, 544, 332, 332);
  text(ticket.id, W / 2, 952, `600 34px ${M}`, "#f4f5f7", "center");
  text(attendee.name, W / 2, 996, `600 28px ${S}`, "#f4f5f7", "center");
  text(`${naira(ticket.pricePaid)}${seatLabel ? `  ·  ${seatLabel}` : ""}`, W / 2, 1034, `500 22px ${S}`, "#a3a9b4", "center");
  g.fillStyle = "#e11d2e"; g.fillRect(0, H - 56, W, 56);
  text("SINGLE USE  ·  VOID AFTER FIRST SCAN", W / 2, H - 20, `600 22px ${D}`, "#fff", "center");
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not render the e-ticket image.");
  downloadFile(`${ticket.id}.png`, blob);
}

export function useETicketRef() {
  return useRef<HTMLDivElement>(null);
}
