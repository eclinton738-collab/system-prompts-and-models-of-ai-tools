import { getStore } from "@/lib/server/store";
import { ok, handleError, paginate } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const store = getStore();
    const query = (params.get("q") ?? "").trim().toLowerCase();
    const payment = params.get("payment");
    const presence = params.get("presence");
    const type = params.get("type");

    let rows = store
      .tickets()
      .map((ticket) => {
        const attendee = store.attendee(ticket.attendeeId);
        return {
          attendeeId: ticket.attendeeId,
          name: ticket.attendeeName,
          phone: attendee?.phone ?? "",
          email: attendee?.email ?? "",
          ticketId: ticket.id,
          type: ticket.type,
          price: ticket.price,
          paymentStatus: ticket.paymentStatus,
          ticketStatus: ticket.status,
          checkedIn: ticket.status === "USED",
          checkedInAt: ticket.usedAt ?? null,
          purchasedAt: ticket.purchasedAt,
          channel: ticket.channel,
          agentId: ticket.agentId ?? null,
        };
      })
      .sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt));

    if (query) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.phone.includes(query) ||
          r.email.toLowerCase().includes(query) ||
          r.ticketId.toLowerCase().includes(query),
      );
    }
    if (payment && payment !== "ALL") rows = rows.filter((r) => r.paymentStatus === payment);
    if (type && type !== "ALL") rows = rows.filter((r) => r.type === type);
    if (presence === "IN") rows = rows.filter((r) => r.checkedIn);
    if (presence === "OUT") rows = rows.filter((r) => !r.checkedIn);

    return ok(paginate(rows, params));
  } catch (err) {
    return handleError(err);
  }
}
