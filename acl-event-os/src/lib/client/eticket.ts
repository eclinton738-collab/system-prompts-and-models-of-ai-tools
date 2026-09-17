import QRCode from "qrcode";
import { formatNaira, formatDate, formatTime } from "@/lib/domain/format";
import { TICKET_TYPES } from "@/lib/domain/catalog";
import type { AclEvent, Ticket } from "@/lib/domain/types";

/**
 * Builds a self-contained e-ticket document.
 *
 * Everything is inlined, including the QR image, so the file works offline and
 * prints to PDF from any browser. In production this same markup is what the
 * delivery service renders and attaches.
 */
export async function buildETicketHtml(ticket: Ticket, token: string, event: AclEvent): Promise<string> {
  const qr = await QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 520,
    color: { dark: "#0A0B0E", light: "#FFFFFF" },
  });
  const def = TICKET_TYPES[ticket.type];
  const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(ticket.id)} — ACL E-Ticket</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#08090C;color:#F4F6F8;font-family:"Helvetica Neue",Arial,sans-serif;padding:24px;display:flex;justify-content:center}
  .t{width:100%;max-width:420px;background:linear-gradient(180deg,#12151B,#0A0C10);border:1px solid #2A2F38;border-radius:6px;overflow:hidden}
  .bar{height:4px;background:linear-gradient(90deg,#E11021,#E4B13E)}
  .hd{padding:20px 20px 14px;border-bottom:1px dashed #2A2F38;text-align:center}
  .brand{font-size:34px;font-weight:900;letter-spacing:-1px;line-height:1}
  .tag{font-size:8px;letter-spacing:3px;color:#8A93A0;margin-top:6px;text-transform:uppercase}
  .ev{font-size:17px;font-weight:800;margin-top:14px;text-transform:uppercase;letter-spacing:-.3px}
  .meta{font-size:11px;color:#AEB6C2;margin-top:5px}
  .tier{display:inline-block;margin-top:12px;padding:5px 14px;border:1px solid #E4B13E;color:#E4B13E;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;border-radius:3px}
  .qr{padding:20px;text-align:center;background:#0A0C10}
  .qr img{width:200px;height:200px;background:#fff;padding:8px;border-radius:4px}
  .id{font-family:ui-monospace,Menlo,monospace;font-size:14px;letter-spacing:1px;margin-top:12px;color:#fff}
  .rows{padding:4px 20px 18px}
  .r{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #1C2027;font-size:12px}
  .r:last-child{border:0}
  .k{color:#8A93A0;text-transform:uppercase;letter-spacing:1.4px;font-size:9px;padding-top:2px}
  .v{font-weight:700;text-align:right}
  .ft{padding:14px 20px;background:#06070A;border-top:1px solid #2A2F38;font-size:9px;color:#6E7683;line-height:1.7;text-align:center;letter-spacing:1px;text-transform:uppercase}
  @media print{body{background:#fff;padding:0}.t{border-color:#ccc}}
</style></head>
<body><div class="t">
  <div class="bar"></div>
  <div class="hd">
    <div class="brand">ACL</div>
    <div class="tag">Africa Combat League</div>
    <div class="ev">${escape(event.name)}</div>
    <div class="meta">${formatDate(event.startsAt)} · ${formatTime(event.startsAt)} · ${escape(event.venue)}, ${escape(event.location)}</div>
    <div class="tier">${escape(def.name)}</div>
  </div>
  <div class="qr">
    <img src="${qr}" alt="Entry QR code for ${escape(ticket.id)}" />
    <div class="id">${escape(ticket.id)}</div>
  </div>
  <div class="rows">
    <div class="r"><span class="k">Attendee</span><span class="v">${escape(ticket.attendeeName)}</span></div>
    <div class="r"><span class="k">Ticket type</span><span class="v">${escape(def.name)}</span></div>
    <div class="r"><span class="k">Amount paid</span><span class="v">${formatNaira(ticket.price)}</span></div>
    <div class="r"><span class="k">Payment</span><span class="v">${ticket.paymentStatus}</span></div>
    <div class="r"><span class="k">Admits</span><span class="v">${def.seatsPerTicket} ${def.seatsPerTicket > 1 ? "guests" : "guest"}</span></div>
  </div>
  <div class="ft">
    This QR code admits once. Screenshots and copies are rejected at the gate.<br />
    Unchained. Unbreakable. Unbound.
  </div>
</div></body></html>`;
}

export function downloadFile(filename: string, contents: string, type = "text/html") {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function printHtml(contents: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(contents);
  doc.close();
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1000);
  };
}
