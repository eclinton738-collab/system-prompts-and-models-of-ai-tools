import { getStore } from "@/lib/server/store";
import { ok, handleError, paginate } from "@/lib/server/api";

export const dynamic = "force-dynamic";

/** The full audit trail: every scan, granted or not, with its reason. */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const store = getStore();
    const query = (params.get("q") ?? "").trim().toLowerCase();
    const filter = params.get("filter") ?? "ALL";
    const gate = params.get("gate");

    let rows = store.checkIns().map((c) => {
      const ticket = store.ticket(c.ticketId);
      const attendee = ticket ? store.attendee(ticket.attendeeId) : undefined;
      return { ...c, phone: attendee?.phone ?? "", email: attendee?.email ?? "" };
    });

    if (query) {
      rows = rows.filter(
        (c) =>
          c.ticketId.toLowerCase().includes(query) ||
          c.attendeeName.toLowerCase().includes(query) ||
          c.phone.includes(query),
      );
    }
    switch (filter) {
      case "GRANTED":
        rows = rows.filter((c) => c.result === "GRANTED");
        break;
      case "REJECTED":
        rows = rows.filter((c) => c.result === "REJECTED");
        break;
      case "DUPLICATE":
        rows = rows.filter((c) => c.reason === "ALREADY_USED");
        break;
      case "INVALID":
        rows = rows.filter(
          (c) => c.reason === "TICKET_NOT_FOUND" || c.reason === "INVALID_SIGNATURE" || c.reason === "MALFORMED_PAYLOAD",
        );
        break;
      case "PENDING_PAYMENT":
        rows = rows.filter((c) => c.reason === "PAYMENT_PENDING" || c.reason === "PAYMENT_FAILED");
        break;
    }
    if (gate && gate !== "ALL") rows = rows.filter((c) => c.gateId === gate);

    return ok(paginate(rows, params));
  } catch (err) {
    return handleError(err);
  }
}
