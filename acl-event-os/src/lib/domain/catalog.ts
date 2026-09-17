import type { TicketTypeCode, TicketTypeDef, SeatSection } from "./types";

/**
 * Ticket catalogue. Prices live here only — every revenue figure in the app is
 * derived from these numbers and the ticket records, never typed by hand.
 */
export const TICKET_TYPES: Record<TicketTypeCode, TicketTypeDef> = {
  GENERAL: {
    code: "GENERAL",
    name: "General",
    price: 10_000,
    allocation: 232,
    seatsPerTicket: 1,
    idSegment: "GEN",
    description: "Standing and open seating on the arena floor perimeter.",
    perks: ["Arena access", "Open seating", "Concession access"],
    premium: false,
  },
  VIP: {
    code: "VIP",
    name: "VIP",
    price: 25_000,
    allocation: 96,
    seatsPerTicket: 1,
    idSegment: "VIP",
    description: "Reserved elevated seating with priority entry lane.",
    perks: ["Reserved seat", "Priority entry", "VIP bar access"],
    premium: false,
  },
  VVIP: {
    code: "VVIP",
    name: "VVIP",
    price: 50_000,
    allocation: 56,
    seatsPerTicket: 1,
    idSegment: "VVIP",
    description: "Lower bowl seating with hospitality service.",
    perks: ["Lower bowl seat", "Hospitality service", "Fighter walkout view"],
    premium: true,
  },
  RINGSIDE: {
    code: "RINGSIDE",
    name: "Ringside",
    price: 100_000,
    allocation: 28,
    seatsPerTicket: 1,
    idSegment: "RING",
    description: "Cage-side seating. Closest seat in the building.",
    perks: ["Cage-side seat", "Dedicated host", "Weigh-in access"],
    premium: true,
  },
  EXECUTIVE: {
    code: "EXECUTIVE",
    name: "Executive Table",
    price: 250_000,
    allocation: 8,
    seatsPerTicket: 6,
    idSegment: "TBL-EX",
    description: "Private six-seat table with bottle service.",
    perks: ["Seats 6", "Bottle service", "Private entrance", "Table host"],
    premium: true,
  },
  ROYAL: {
    code: "ROYAL",
    name: "Royal Table",
    price: 500_000,
    allocation: 5,
    seatsPerTicket: 8,
    idSegment: "TBL-RY",
    description: "Eight-seat cage-adjacent table. The best position in the arena.",
    perks: [
      "Seats 8",
      "Cage-adjacent",
      "Premium bottle service",
      "Fighter meet & greet",
      "Dedicated security escort",
    ],
    premium: true,
  },
};

export const TICKET_TYPE_ORDER: TicketTypeCode[] = [
  "GENERAL",
  "VIP",
  "VVIP",
  "RINGSIDE",
  "EXECUTIVE",
  "ROYAL",
];

export const TICKET_TYPE_LIST: TicketTypeDef[] = TICKET_TYPE_ORDER.map((c) => TICKET_TYPES[c]);

/**
 * Chart colour per tier — one source of truth so charts, legends and tables
 * never disagree.
 *
 * Validated with the dataviz palette checker against the #0D0F13 chart surface
 * in dark mode: lightness band, chroma floor, adjacent-pair CVD separation,
 * normal-vision floor and contrast all PASS in adjacent mode, which is the mode
 * that matches these marks — donut slices and stacked bars only ever touch
 * their neighbours. Under the stricter all-pairs mode the non-adjacent pair
 * GENERAL↔RINGSIDE lands at ΔE 14.4 against a 15 floor; an exhaustive hue sweep
 * showed no six-hue set clears it inside the dark band while keeping ACL red,
 * blue, gold and green. Identity therefore never rests on colour alone: every
 * series carries a direct label and a legend entry.
 */
export const TYPE_COLOR: Record<TicketTypeCode, string> = {
  GENERAL: "#E11021",
  VIP: "#3396FF",
  VVIP: "#BC8C22",
  RINGSIDE: "#CB4295",
  EXECUTIVE: "#0D8E52",
  ROYAL: "#8250F0",
};

/** Resolve "ACL-TBL-EX-007" / "ACL-VIP-000482" back to its tier. */
export function typeFromTicketId(ticketId: string): TicketTypeCode | undefined {
  const id = ticketId.trim().toUpperCase();
  if (!id.startsWith("ACL-")) return undefined;
  // Longest segment first so TBL-EX is not shadowed by a shorter prefix.
  const bySegmentLength = [...TICKET_TYPE_LIST].sort(
    (a, b) => b.idSegment.length - a.idSegment.length,
  );
  return bySegmentLength.find((t) => id.startsWith(`ACL-${t.idSegment}-`))?.code;
}

export function formatTicketId(type: TicketTypeCode, sequence: number): string {
  const def = TICKET_TYPES[type];
  const width = def.seatsPerTicket > 1 ? 3 : 6;
  return `ACL-${def.idSegment}-${String(sequence).padStart(width, "0")}`;
}

/** 500-capacity arena layout, positioned on a 100x100 grid. */
export const SEAT_SECTIONS: SeatSection[] = [
  { code: "EXECUTIVE", name: "Executive Tables", capacity: 48, ticketType: "EXECUTIVE", x: 21, y: 4, w: 58, h: 9, tone: "green" },
  { code: "GENERAL", name: "General Admission", capacity: 232, ticketType: "GENERAL", x: 3, y: 17, w: 15, h: 62, tone: "red" },
  { code: "VIP", name: "VIP", capacity: 96, ticketType: "VIP", x: 82, y: 17, w: 15, h: 62, tone: "blue" },
  { code: "RINGSIDE", name: "Ringside", capacity: 28, ticketType: "RINGSIDE", x: 21, y: 24, w: 10, h: 48, tone: "gold" },
  { code: "ROYAL", name: "Royal Tables", capacity: 40, ticketType: "ROYAL", x: 69, y: 24, w: 10, h: 48, tone: "gold" },
  { code: "STAGE", name: "Stage / Cage", capacity: 0, x: 37, y: 33, w: 26, h: 30, tone: "neutral" },
  { code: "VVIP", name: "VVIP", capacity: 56, ticketType: "VVIP", x: 21, y: 79, w: 58, h: 9, tone: "violet" },
  { code: "ENTRANCE", name: "Main Entrance", capacity: 0, x: 24, y: 91, w: 22, h: 6, tone: "neutral" },
  { code: "EXIT", name: "Emergency Exit", capacity: 0, x: 54, y: 91, w: 22, h: 6, tone: "neutral" },
];

/** Seats an allocation of `n` tickets consumes for a tier. */
export function seatsForTickets(type: TicketTypeCode, tickets: number): number {
  return TICKET_TYPES[type].seatsPerTicket * tickets;
}

/** Total seats the catalogue allocates — must equal the venue capacity. */
export const TOTAL_ALLOCATED_SEATS = TICKET_TYPE_LIST.reduce(
  (sum, t) => sum + t.allocation * t.seatsPerTicket,
  0,
);

/** Revenue if every allocated ticket sells. The ceiling any target sits under. */
export const INVENTORY_CEILING = TICKET_TYPE_LIST.reduce(
  (sum, t) => sum + t.allocation * t.price,
  0,
);
