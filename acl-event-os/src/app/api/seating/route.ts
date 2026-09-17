import { getStore } from "@/lib/server/store";
import { ok } from "@/lib/server/api";
import { SEAT_SECTIONS, TICKET_TYPES } from "@/lib/domain/catalog";
import { revenueOf } from "@/lib/domain/stats";

export const dynamic = "force-dynamic";

/** Section-level occupancy for the arena map. */
export async function GET() {
  const store = getStore();
  const tickets = store.tickets();

  const sections = SEAT_SECTIONS.map((section) => {
    if (!section.ticketType) {
      return { ...section, sold: 0, available: 0, revenue: 0, checkedIn: 0, seatsPerTicket: 1, tickets: 0 };
    }
    const def = TICKET_TYPES[section.ticketType];
    const ofType = tickets.filter((t) => t.type === section.ticketType && t.paymentStatus !== "FAILED");
    const soldSeats = ofType.length * def.seatsPerTicket;
    return {
      ...section,
      tickets: ofType.length,
      seatsPerTicket: def.seatsPerTicket,
      sold: soldSeats,
      available: Math.max(0, section.capacity - soldSeats),
      revenue: revenueOf(ofType),
      checkedIn: ofType.filter((t) => t.status === "USED").length * def.seatsPerTicket,
    };
  });

  const seated = sections.reduce((s, x) => s + x.sold, 0);
  return ok({
    sections,
    capacity: store.event.capacity,
    seated,
    available: Math.max(0, store.event.capacity - seated),
    tables: store.tables,
  });
}
