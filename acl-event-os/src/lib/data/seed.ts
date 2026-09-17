import { mulberry32, pick, intBetween, shuffled } from "./random";
import { FIRST_NAMES, LAST_NAMES, CORPORATE_BUYERS, AGENT_LOCATIONS } from "./names";
import { TICKET_TYPES, TICKET_TYPE_ORDER, formatTicketId } from "../domain/catalog";
import { normalisePhone } from "../domain/schemas";
import type {
  AclEvent, AclNotification, Agent, Attendee, CheckIn, EventTable, Gate,
  Payment, PaymentMethod, PaymentStatus, SalesChannel, SecurityEvent,
  Ticket, TicketTypeCode, User,
} from "../domain/types";

/**
 * Demo dataset.
 *
 * Every published figure in the dashboard falls out of these records — nothing
 * is written into the UI by hand. The targets below are the sales position the
 * event is in; the generator builds records that add up to them exactly, and
 * `src/tests/run.ts` asserts the arithmetic on every run.
 */
const PAID_BY_TYPE: Record<TicketTypeCode, number> = {
  GENERAL: 193, VIP: 76, VVIP: 27, RINGSIDE: 8, EXECUTIVE: 5, ROYAL: 3,
};
/** Unsettled General tickets: 8 pending + 5 failed + 2 refunded = 15. */
const UNPAID_GENERAL: Array<[PaymentStatus, number]> = [
  ["PENDING", 8], ["FAILED", 5], ["REFUNDED", 2],
];
const TARGET_CHECKED_IN = 186;
const SCANS_LAST_HOUR = 24;

/** First issued sequence per tier — chosen so the brief's ticket IDs exist. */
const SEQ_START: Record<TicketTypeCode, number> = {
  GENERAL: 314, VIP: 407, VVIP: 275, RINGSIDE: 41, EXECUTIVE: 1, ROYAL: 1,
};
const SOLD_EXEC_TABLES = [1, 3, 5, 7, 8];
const SOLD_ROYAL_TABLES = [1, 2, 4];
const EXEC_TABLE_COUNT = 8;
const ROYAL_TABLE_COUNT = 5;

export const EVENT_ID = "evt-lions-den-2026";
export const ALT_EVENT_ID = "evt-warriors-gate-2026";

const CHANNEL_WEIGHTS: Array<[SalesChannel, number]> = [
  ["WEBSITE", 52], ["POS_AGENT", 28], ["BANK_TRANSFER", 12], ["USSD", 6], ["CASH", 2],
];

const METHOD_FOR_CHANNEL: Record<SalesChannel, PaymentMethod> = {
  WEBSITE: "CARD", POS_AGENT: "POS_AGENT", BANK_TRANSFER: "BANK_TRANSFER",
  USSD: "USSD", CASH: "CASH_OUTLET",
};

export interface SeedData {
  event: AclEvent;
  altEvent: AclEvent;
  users: User[];
  agents: Agent[];
  attendees: Attendee[];
  tickets: Ticket[];
  payments: Payment[];
  checkIns: CheckIn[];
  securityEvents: SecurityEvent[];
  tables: EventTable[];
  notifications: AclNotification[];
  /** Per-ticket QR nonce, mirroring a `qr_nonce` column. */
  nonces: Record<string, string>;
}

const GATES: Gate[] = [
  { id: "gate-main", name: "Main Entrance", allowedTypes: [], active: true },
  { id: "gate-vip", name: "VIP & VVIP Gate", allowedTypes: ["VIP", "VVIP", "RINGSIDE"], active: true },
  { id: "gate-tables", name: "Tables Entrance", allowedTypes: ["EXECUTIVE", "ROYAL", "RINGSIDE"], active: true },
  { id: "gate-west", name: "Main Gate (West)", allowedTypes: [], active: true },
];

const USERS: User[] = [
  { id: "usr-clinton", name: "Clinton Edward", email: "clinton@africacombatleague.com", role: "SUPER_ADMIN", initials: "CE", active: true },
  { id: "usr-manager", name: "Ada Mbakwe", email: "ada@africacombatleague.com", role: "EVENT_MANAGER", initials: "AM", active: true },
  { id: "usr-finance", name: "Tunde Bakare", email: "finance@africacombatleague.com", role: "FINANCE", initials: "TB", active: true },
  { id: "usr-staff-04", name: "ACL Staff 04", email: "gate04@africacombatleague.com", role: "CHECK_IN_STAFF", initials: "S4", active: true },
  { id: "usr-staff-07", name: "ACL Staff 07", email: "gate07@africacombatleague.com", role: "CHECK_IN_STAFF", initials: "S7", active: true },
  { id: "usr-security", name: "Emeka Dike", email: "security@africacombatleague.com", role: "SECURITY", initials: "ED", active: true },
  { id: "usr-agent", name: "Ifeoma Nwodo", email: "agent@africacombatleague.com", role: "TICKET_AGENT", initials: "IN", active: true },
];

const DEVICES = ["ACL-SCN-01", "ACL-SCN-02", "ACL-SCN-03", "ACL-SCN-04"];

function fullName(rng: () => number): string {
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
}

function phoneFor(rng: () => number): string {
  const prefix = pick(rng, ["0803", "0806", "0810", "0813", "0703", "0706", "0814", "0909"]);
  return normalisePhone(`${prefix}${String(intBetween(rng, 1000000, 9999999)).padStart(7, "0")}`);
}

function emailFor(name: string, rng: () => number): string {
  const host = pick(rng, ["gmail.com", "yahoo.com", "outlook.com", "acl.ng"]);
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${intBetween(rng, 1, 99)}@${host}`;
}

function weightedChannel(rng: () => number): SalesChannel {
  const total = CHANNEL_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [channel, weight] of CHANNEL_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return channel;
  }
  return "WEBSITE";
}

function nonce(rng: () => number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => alphabet[Math.floor(rng() * alphabet.length)]).join("");
}

/** Ticket IDs the brief names explicitly; the generator pins them to real people. */
const PINNED: Record<string, { name: string; channel: SalesChannel }> = {
  "ACL-GEN-000521": { name: "Chidi Okafor", channel: "WEBSITE" },
  "ACL-GEN-000520": { name: "David Nwachukwu", channel: "USSD" },
  "ACL-VIP-000482": { name: "John Doe", channel: "BANK_TRANSFER" },
  "ACL-VVIP-000301": { name: "Amara Eze", channel: "WEBSITE" },
  "ACL-GEN-000398": { name: "Obinna Umeh", channel: "POS_AGENT" },
};
/** The five most recent sales, newest first — the dashboard's live feed. */
const RECENT_SALE_ORDER = [
  "ACL-GEN-000521", "ACL-VIP-000482", "ACL-VVIP-000301", "ACL-GEN-000520", "ACL-TBL-EX-007",
];
/** Held back from check-in so the duplicate/ticket-state demos stay reproducible. */
const SUSPENDED_TICKET = "ACL-GEN-000455";

export function buildSeed(now: number): SeedData {
  const rng = mulberry32(20260926);
  const eventStart = Date.parse("2026-09-26T17:00:00+01:00");

  const event: AclEvent = {
    id: EVENT_ID,
    name: "Lion's Den: The First Roar",
    status: "LIVE",
    startsAt: new Date(eventStart).toISOString(),
    venue: "Indoor Arena",
    location: "Aba, Abia State",
    capacity: 500,
    projectedRevenue: 14_500_000,
    currency: "NGN",
    gates: GATES,
    rules: {
      doorsOpenMinutesBefore: 180,
      entryClosesMinutesAfter: 180,
      singleUseTickets: true,
      allowPendingPaymentOverride: false,
      refundWindowHours: 72,
    },
    refundPolicy:
      "Full refunds up to 72 hours before doors open. Inside 72 hours tickets are transferable but non-refundable. Table bookings require 7 days notice for a full refund.",
  };

  const altEvent: AclEvent = {
    ...event,
    id: ALT_EVENT_ID,
    name: "Warrior's Gate: Lagos",
    status: "ON_SALE",
    startsAt: new Date(Date.parse("2026-12-12T17:00:00+01:00")).toISOString(),
    venue: "Teslim Balogun Stadium",
    location: "Surulere, Lagos",
    capacity: 1200,
    projectedRevenue: 42_000_000,
  };

  const agents: Agent[] = Array.from({ length: 6 }, (_, i) => ({
    id: `AGT-${String(i + 1).padStart(3, "0")}`,
    name: fullName(rng),
    phone: phoneFor(rng),
    location: AGENT_LOCATIONS[i % AGENT_LOCATIONS.length],
    commissionRate: [0.07, 0.05, 0.06, 0.05, 0.08, 0.06][i],
    status: i === 5 ? "SUSPENDED" : "ACTIVE",
    createdAt: new Date(now - (60 - i * 4) * 86_400_000).toISOString(),
  }));
  const activeAgents = agents.filter((a) => a.status === "ACTIVE");

  // ---- 1. Decide every ticket's identity and payment state --------------
  interface Spec {
    id: string;
    type: TicketTypeCode;
    paymentStatus: PaymentStatus;
    tableNo?: number;
  }
  const specs: Spec[] = [];

  const generalTotal = PAID_BY_TYPE.GENERAL + UNPAID_GENERAL.reduce((s, [, n]) => s + n, 0);
  const generalSeqs = Array.from({ length: generalTotal }, (_, i) => SEQ_START.GENERAL + i);
  const reserved = new Set(
    [...Object.keys(PINNED), SUSPENDED_TICKET].map((id) => Number(id.split("-").pop())),
  );
  // Unsettled tickets are drawn from the middle of the run, never from the
  // pinned IDs, so the named records keep their stated status.
  const unpaidPool = shuffled(rng, generalSeqs.filter((s) => !reserved.has(s)));
  const unpaidAssignment = new Map<number, PaymentStatus>();
  let cursor = 0;
  for (const [status, count] of UNPAID_GENERAL) {
    for (let i = 0; i < count; i++) unpaidAssignment.set(unpaidPool[cursor++], status);
  }
  for (const seq of generalSeqs) {
    specs.push({
      id: formatTicketId("GENERAL", seq),
      type: "GENERAL",
      paymentStatus: unpaidAssignment.get(seq) ?? "PAID",
    });
  }

  for (const type of ["VIP", "VVIP", "RINGSIDE"] as const) {
    for (let i = 0; i < PAID_BY_TYPE[type]; i++) {
      specs.push({ id: formatTicketId(type, SEQ_START[type] + i), type, paymentStatus: "PAID" });
    }
  }
  for (const no of SOLD_EXEC_TABLES) {
    specs.push({ id: formatTicketId("EXECUTIVE", no), type: "EXECUTIVE", paymentStatus: "PAID", tableNo: no });
  }
  for (const no of SOLD_ROYAL_TABLES) {
    specs.push({ id: formatTicketId("ROYAL", no), type: "ROYAL", paymentStatus: "PAID", tableNo: no });
  }

  // ---- 2. Purchase timeline --------------------------------------------
  // Sales are scheduled into week buckets rather than sampled freely, so the
  // week-on-week movement the dashboard reports is a property of the book —
  // the KPI reads it off the ticket rows like any other figure.
  const SALES_WINDOW_DAYS = 35;
  const WEEK_MS = 7 * 86_400_000;
  const THIS_WEEK = 75;   // tickets sold in the last 7 days
  const LAST_WEEK = 67;   // the 7 days before that → 75/67 = +11.9%
  const REVENUE_GROWTH_TARGET = 1.18;

  const recentSlots = new Map<string, number>(
    RECENT_SALE_ORDER.map((id, i) => [id, now - (5 + i * 2.5) * 60_000]),
  );

  // Bucket 0 = this week, 1 = last week, 2 = everything earlier.
  const buckets = new Map<string, 0 | 1 | 2>();
  const pinned = specs.filter((s) => recentSlots.has(s.id));
  const rest = shuffled(rng, specs.filter((s) => !recentSlots.has(s.id)));
  pinned.forEach((s) => buckets.set(s.id, 0));
  rest.forEach((s, i) => {
    const index = i + pinned.length;
    buckets.set(s.id, index < THIS_WEEK ? 0 : index < THIS_WEEK + LAST_WEEK ? 1 : 2);
  });

  // Nudge the tier mix between the two weeks until settled revenue grows at
  // the target rate. Swaps preserve each week's ticket count.
  const priceOf = (spec: Spec) => (spec.paymentStatus === "PAID" ? TICKET_TYPES[spec.type].price : 0);
  const movable = (spec: Spec) => !recentSlots.has(spec.id);
  const weekRevenue = (bucket: 0 | 1) =>
    specs.reduce((sum, s) => (buckets.get(s.id) === bucket ? sum + priceOf(s) : sum), 0);

  for (let pass = 0; pass < 240; pass++) {
    const rev0 = weekRevenue(0);
    const rev1 = weekRevenue(1);
    const gap = rev0 - REVENUE_GROWTH_TARGET * rev1;
    if (Math.abs(gap) < 20_000) break;
    const week0 = specs.filter((s) => buckets.get(s.id) === 0 && movable(s));
    const week1 = specs.filter((s) => buckets.get(s.id) === 1 && movable(s));
    let best: { a: Spec; b: Spec; score: number } | null = null;
    for (const a of week0) {
      for (const b of week1) {
        if (priceOf(a) === priceOf(b)) continue;
        const nextGap =
          rev0 - priceOf(a) + priceOf(b) - REVENUE_GROWTH_TARGET * (rev1 - priceOf(b) + priceOf(a));
        const score = Math.abs(nextGap);
        if (score < Math.abs(gap) && (!best || score < best.score)) best = { a, b, score };
      }
    }
    if (!best) break;
    buckets.set(best.a.id, 1);
    buckets.set(best.b.id, 0);
  }

  const purchaseTimes = new Map<string, number>();
  for (const spec of specs) {
    const pinnedAt = recentSlots.get(spec.id);
    if (pinnedAt !== undefined) {
      purchaseTimes.set(spec.id, pinnedAt);
      continue;
    }
    const bucket = buckets.get(spec.id) ?? 2;
    let at: number;
    if (bucket === 0) {
      at = now - rng() * (WEEK_MS - 30 * 60_000) - 25 * 60_000;
    } else if (bucket === 1) {
      at = now - WEEK_MS - rng() * WEEK_MS;
    } else {
      // Earlier sales ramp gently toward the event.
      const span = SALES_WINDOW_DAYS * 86_400_000 - 2 * WEEK_MS;
      at = now - 2 * WEEK_MS - Math.pow(rng(), 0.9) * span;
    }
    purchaseTimes.set(spec.id, at);
  }

  // ---- 3. Materialise attendees, payments and tickets -------------------
  const attendees: Attendee[] = [];
  const payments: Payment[] = [];
  const tickets: Ticket[] = [];
  const nonces: Record<string, string> = {};
  const tableBuyers = new Map<string, { name: string; phone: string; ticketId: string }>();

  const sortedSpecs = [...specs].sort(
    (a, b) => (purchaseTimes.get(a.id) ?? 0) - (purchaseTimes.get(b.id) ?? 0),
  );

  sortedSpecs.forEach((spec, index) => {
    const def = TICKET_TYPES[spec.type];
    const isTable = def.seatsPerTicket > 1;
    const pinned = PINNED[spec.id];
    const name = pinned?.name ?? (isTable ? CORPORATE_BUYERS[(spec.tableNo ?? index) % CORPORATE_BUYERS.length] : fullName(rng));
    const purchasedAt = new Date(purchaseTimes.get(spec.id) ?? now).toISOString();

    const attendee: Attendee = {
      id: `att-${index + 1}`,
      name,
      phone: phoneFor(rng),
      email: emailFor(name, rng),
      createdAt: purchasedAt,
    };
    attendees.push(attendee);

    const channel: SalesChannel = pinned?.channel ?? (isTable ? "BANK_TRANSFER" : weightedChannel(rng));
    const method = METHOD_FOR_CHANNEL[channel];
    const agent = channel === "POS_AGENT" ? pick(rng, activeAgents) : undefined;
    const settled = spec.paymentStatus === "PAID";

    const payment: Payment = {
      id: `PAY-${String(index + 1).padStart(6, "0")}`,
      reference: `ACLPAY${String(index + 1).padStart(6, "0")}${nonce(rng).slice(0, 4)}`,
      ticketIds: [spec.id],
      attendeeId: attendee.id,
      customerName: name,
      amount: def.price,
      method,
      status: spec.paymentStatus,
      createdAt: purchasedAt,
      settledAt: settled ? new Date(Date.parse(purchasedAt) + intBetween(rng, 4, 90) * 1000).toISOString() : undefined,
      agentId: agent?.id,
      providerRef: method === "CARD" ? `ps_${nonce(rng).toLowerCase()}` : undefined,
      failureReason:
        spec.paymentStatus === "FAILED"
          ? pick(rng, ["Insufficient funds", "Card declined by issuer", "Transaction timed out", "3-D Secure not completed"])
          : undefined,
      refundedAt:
        spec.paymentStatus === "REFUNDED"
          ? new Date(Date.parse(purchasedAt) + intBetween(rng, 2, 9) * 86_400_000).toISOString()
          : undefined,
    };
    payments.push(payment);

    const ticket: Ticket = {
      id: spec.id,
      eventId: EVENT_ID,
      type: spec.type,
      attendeeId: attendee.id,
      attendeeName: name,
      price: def.price,
      status:
        spec.paymentStatus === "REFUNDED" ? "REFUNDED" : spec.id === SUSPENDED_TICKET ? "SUSPENDED" : "VALID",
      paymentId: payment.id,
      paymentStatus: spec.paymentStatus,
      channel,
      agentId: agent?.id,
      tableId: spec.tableNo !== undefined ? spec.id : undefined,
      purchasedAt,
      version: 1,
    };
    tickets.push(ticket);
    nonces[ticket.id] = nonce(rng);
    if (spec.tableNo !== undefined) {
      tableBuyers.set(spec.id, { name, phone: attendee.phone, ticketId: spec.id });
    }
  });

  // A handful of tickets from a different ACL event — the wrong-event path
  // has to be exercisable at the gate, not just described.
  const altSpecs: Array<[string, TicketTypeCode]> = [
    ["ACL-VIP-000015", "VIP"],
    ["ACL-GEN-000042", "GENERAL"],
  ];
  altSpecs.forEach(([id, type], i) => {
    const name = fullName(rng);
    const att: Attendee = {
      id: `att-alt-${i + 1}`, name, phone: phoneFor(rng), email: emailFor(name, rng),
      createdAt: new Date(now - 12 * 86_400_000).toISOString(),
    };
    attendees.push(att);
    const pay: Payment = {
      id: `PAY-ALT-${i + 1}`, reference: `ACLPAYALT${i + 1}`, ticketIds: [id], attendeeId: att.id,
      customerName: name, amount: TICKET_TYPES[type].price, method: "CARD", status: "PAID",
      createdAt: att.createdAt, settledAt: att.createdAt,
    };
    payments.push(pay);
    tickets.push({
      id, eventId: ALT_EVENT_ID, type, attendeeId: att.id, attendeeName: name,
      price: TICKET_TYPES[type].price, status: "VALID", paymentId: pay.id, paymentStatus: "PAID",
      channel: "WEBSITE", purchasedAt: att.createdAt, version: 1,
    });
    nonces[id] = nonce(rng);
  });

  // ---- 4. Check-ins -----------------------------------------------------
  const admissible = tickets.filter(
    (t) => t.eventId === EVENT_ID && t.paymentStatus === "PAID" && t.status === "VALID",
  );
  const byId = new Map(tickets.map((t) => [t.id, t]));
  const mustAdmit = ["ACL-VIP-000482", "ACL-VVIP-000301", "ACL-GEN-000398"];
  const pool = shuffled(rng, admissible.filter((t) => !mustAdmit.includes(t.id)));
  const admitted = [
    ...mustAdmit.map((id) => byId.get(id)!).filter(Boolean),
    ...pool.slice(0, TARGET_CHECKED_IN - mustAdmit.length),
  ];

  // Gate traffic over the last 4.5 hours, with a rush inside the final hour.
  const scanTimes: number[] = [];
  for (let i = 0; i < SCANS_LAST_HOUR; i++) scanTimes.push(now - intBetween(rng, 3, 58) * 60_000);
  for (let i = 0; i < admitted.length - SCANS_LAST_HOUR; i++) {
    scanTimes.push(now - intBetween(rng, 61, 270) * 60_000);
  }
  scanTimes.sort((a, b) => a - b);

  const gateFor = (type: TicketTypeCode): Gate => {
    if (type === "EXECUTIVE" || type === "ROYAL") return GATES[2];
    if (type === "VIP" || type === "VVIP" || type === "RINGSIDE") return GATES[1];
    return rng() > 0.35 ? GATES[0] : GATES[3];
  };
  const operators = USERS.filter((u) => u.role === "CHECK_IN_STAFF" || u.role === "EVENT_MANAGER");

  const checkIns: CheckIn[] = [];
  // Newest scan is reserved for the ticket the dashboard shows as "recent scan".
  const ordered = [...admitted];
  const headlineIdx = ordered.findIndex((t) => t.id === "ACL-VIP-000482");
  if (headlineIdx >= 0) ordered.push(...ordered.splice(headlineIdx, 1));
  const dupTicketIdx = ordered.findIndex((t) => t.id === "ACL-GEN-000398");
  if (dupTicketIdx >= 0) {
    // Force the duplicate-demo ticket to have been admitted early in the night.
    const [dup] = ordered.splice(dupTicketIdx, 1);
    ordered.unshift(dup);
  }

  ordered.forEach((ticket, i) => {
    const at = i === ordered.length - 1 ? now - 2 * 60_000 : scanTimes[i];
    const gate = ticket.id === "ACL-VIP-000482" ? GATES[0] : ticket.id === "ACL-GEN-000398" ? GATES[3] : gateFor(ticket.type);
    const operator = ticket.id === "ACL-GEN-000398" ? USERS[3] : pick(rng, operators);
    const iso = new Date(at).toISOString();
    ticket.status = "USED";
    ticket.usedAt = iso;
    ticket.usedGateId = gate.id;
    ticket.usedOperatorId = operator.id;
    ticket.version += 1;
    checkIns.push({
      id: `chk-${i + 1}`,
      ticketId: ticket.id,
      eventId: EVENT_ID,
      attendeeName: ticket.attendeeName,
      ticketType: ticket.type,
      gateId: gate.id,
      gateName: gate.name,
      operatorId: operator.id,
      operatorName: operator.name,
      deviceId: pick(rng, DEVICES),
      scannedAt: iso,
      result: "GRANTED",
      durationMs: intBetween(rng, 640, 1900),
    });
  });

  // ---- 5. Rejections and the security log ------------------------------
  const securityEvents: SecurityEvent[] = [];
  const dupTicket = byId.get("ACL-GEN-000398");
  const dupFirst = checkIns.find((c) => c.ticketId === "ACL-GEN-000398");

  interface RejectionSpec {
    ticketId: string;
    reason: CheckIn["reason"];
    kind: SecurityEvent["kind"];
    severity: SecurityEvent["severity"];
    detail: string;
    minutesAgo: number;
    gate: Gate;
    operator: User;
  }
  const rejections: RejectionSpec[] = [
    {
      ticketId: "ACL-GEN-000398", reason: "ALREADY_USED", kind: "DUPLICATE_SCAN", severity: "CRITICAL",
      detail: "Ticket already admitted. Second presentation rejected at the gate.",
      minutesAgo: 19, gate: GATES[0], operator: USERS[4],
    },
    {
      ticketId: "ACL-VIP-009821", reason: "TICKET_NOT_FOUND", kind: "INVALID_TICKET", severity: "HIGH",
      detail: "No ticket exists with this reference for any ACL event.",
      minutesAgo: 24, gate: GATES[1], operator: USERS[3],
    },
    {
      ticketId: "ACL-VIP-000015", reason: "WRONG_EVENT", kind: "WRONG_EVENT", severity: "HIGH",
      detail: "Ticket was issued for Warrior's Gate: Lagos.",
      minutesAgo: 47, gate: GATES[0], operator: USERS[4],
    },
    {
      ticketId: SUSPENDED_TICKET, reason: "TICKET_SUSPENDED", kind: "SUSPENDED_TICKET", severity: "CRITICAL",
      detail: "Ticket suspended by security after a resale-fraud report.",
      minutesAgo: 63, gate: GATES[3], operator: USERS[3],
    },
    {
      ticketId: "ACL-GEN-777777", reason: "MALFORMED_PAYLOAD", kind: "FORGED_PAYLOAD", severity: "CRITICAL",
      detail: "QR signature did not verify — payload was re-encoded off-platform.",
      minutesAgo: 88, gate: GATES[0], operator: USERS[4],
    },
  ];

  const pendingTicket = tickets.find((t) => t.paymentStatus === "PENDING");
  if (pendingTicket) {
    rejections.push({
      ticketId: pendingTicket.id, reason: "PAYMENT_PENDING", kind: "UNPAID_TICKET", severity: "MEDIUM",
      detail: "Bank transfer has not settled. Direct the holder to the payment desk.",
      minutesAgo: 34, gate: GATES[0], operator: USERS[3],
    });
  }
  const refundedTicket = tickets.find((t) => t.paymentStatus === "REFUNDED");
  if (refundedTicket) {
    rejections.push({
      ticketId: refundedTicket.id, reason: "TICKET_REFUNDED", kind: "REFUNDED_TICKET", severity: "HIGH",
      detail: "Ticket was refunded and is no longer admissible.",
      minutesAgo: 71, gate: GATES[3], operator: USERS[4],
    });
  }

  rejections.forEach((spec, i) => {
    const at = new Date(now - spec.minutesAgo * 60_000).toISOString();
    const ticket = byId.get(spec.ticketId);
    checkIns.push({
      id: `chk-rej-${i + 1}`,
      ticketId: spec.ticketId,
      eventId: EVENT_ID,
      attendeeName: ticket?.attendeeName ?? "Unknown",
      ticketType: ticket?.type ?? "UNKNOWN",
      gateId: spec.gate.id,
      gateName: spec.gate.name,
      operatorId: spec.operator.id,
      operatorName: spec.operator.name,
      deviceId: pick(rng, DEVICES),
      scannedAt: at,
      result: "REJECTED",
      reason: spec.reason,
      durationMs: intBetween(rng, 420, 1100),
    });
    securityEvents.push({
      id: `sec-${i + 1}`,
      kind: spec.kind,
      severity: spec.severity,
      ticketId: spec.ticketId,
      eventId: EVENT_ID,
      gateId: spec.gate.id,
      gateName: spec.gate.name,
      operatorId: spec.operator.id,
      operatorName: spec.operator.name,
      deviceId: pick(rng, DEVICES),
      at,
      result: "REJECTED",
      detail: spec.detail,
      firstScanAt: spec.kind === "DUPLICATE_SCAN" ? dupFirst?.scannedAt : undefined,
      firstScanGate: spec.kind === "DUPLICATE_SCAN" ? dupFirst?.gateName : undefined,
      firstScanOperator: spec.kind === "DUPLICATE_SCAN" ? dupFirst?.operatorName : undefined,
    });
  });

  // A successful admission is logged too — the security feed is the whole
  // truth of the gate, not only its failures.
  if (dupTicket && dupFirst) {
    securityEvents.push({
      id: "sec-granted-1", kind: "VALID_CHECK_IN", severity: "INFO", ticketId: "ACL-VVIP-000301",
      eventId: EVENT_ID, gateId: GATES[1].id, gateName: GATES[1].name, operatorId: USERS[3].id,
      operatorName: USERS[3].name, deviceId: DEVICES[1],
      at: checkIns.find((c) => c.ticketId === "ACL-VVIP-000301")?.scannedAt ?? new Date(now - 95 * 60_000).toISOString(),
      result: "GRANTED", detail: "VVIP admitted at the VIP gate.",
    });
  }
  securityEvents.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  checkIns.sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt));

  // ---- 6. Tables --------------------------------------------------------
  const tables: EventTable[] = [];
  const buildTable = (type: "EXECUTIVE" | "ROYAL", no: number): EventTable => {
    const id = formatTicketId(type, no);
    const buyer = tableBuyers.get(id);
    const ticket = byId.get(id);
    const capacity = TICKET_TYPES[type].seatsPerTicket;
    const guests: import("../domain/types").TableGuest[] = buyer
      ? Array.from({ length: capacity }, (_, g) => {
          const checked = ticket?.status === "USED" && g < Math.ceil(capacity * 0.6);
          return {
            id: `${id}-g${g + 1}`,
            name: g === 0 ? buyer.name : fullName(rng),
            checkedIn: Boolean(checked),
            checkedInAt: checked ? ticket?.usedAt : undefined,
          };
        })
      : [];
    return {
      id,
      type,
      label: `${type === "ROYAL" ? "Royal" : "Executive"} ${String(no).padStart(2, "0")}`,
      capacity,
      buyerName: buyer?.name,
      buyerPhone: buyer?.phone,
      ticketId: buyer?.ticketId,
      paymentStatus: buyer ? "PAID" : undefined,
      guests,
      reserved: !buyer && no === 2 && type === "EXECUTIVE",
      reservedNote: !buyer && no === 2 && type === "EXECUTIVE" ? "Held for ACL sponsors — Zenith" : undefined,
    };
  };
  for (let n = 1; n <= EXEC_TABLE_COUNT; n++) tables.push(buildTable("EXECUTIVE", n));
  for (let n = 1; n <= ROYAL_TABLE_COUNT; n++) tables.push(buildTable("ROYAL", n));

  // ---- 7. Notifications -------------------------------------------------
  const notifications: AclNotification[] = [
    {
      id: "ntf-1", kind: "SECURITY_ALERT", priority: "CRITICAL", read: false,
      title: "Duplicate QR scan blocked",
      body: "ACL-GEN-000398 was presented a second time at Main Entrance. Access denied.",
      at: new Date(now - 19 * 60_000).toISOString(), href: "/security",
    },
    {
      id: "ntf-2", kind: "SECURITY_ALERT", priority: "CRITICAL", read: false,
      title: "Unknown ticket reference",
      body: "ACL-VIP-009821 does not exist in any ACL event. Rejected at VIP & VVIP Gate.",
      at: new Date(now - 24 * 60_000).toISOString(), href: "/security",
    },
    {
      id: "ntf-3", kind: "TICKET_SOLD", priority: "NORMAL", read: false,
      title: "New ticket sold",
      body: "Chidi Okafor purchased General (ACL-GEN-000521) for ₦10,000.",
      at: new Date(now - 5 * 60_000).toISOString(), href: "/sales",
    },
    {
      id: "ntf-4", kind: "PAYMENT_RECEIVED", priority: "NORMAL", read: true,
      title: "Payment received",
      body: "Kingsley Group settled ₦250,000 for Executive Table ACL-TBL-EX-007.",
      at: new Date(now - 14 * 60_000).toISOString(), href: "/payments",
    },
    {
      id: "ntf-5", kind: "CAPACITY_WARNING", priority: "HIGH", read: false,
      title: "General admission above 85%",
      body: "General allocation is filling. Review release of held inventory.",
      at: new Date(now - 52 * 60_000).toISOString(), href: "/seating",
    },
    {
      id: "ntf-6", kind: "REFUND", priority: "NORMAL", read: true,
      title: "Refund processed",
      body: `${refundedTicket?.attendeeName ?? "An attendee"} was refunded ₦10,000.`,
      at: new Date(now - 3 * 86_400_000).toISOString(), href: "/payments",
    },
    {
      id: "ntf-7", kind: "SYSTEM", priority: "NORMAL", read: true,
      title: "Scanner ACL-SCN-03 reconnected",
      body: "Tables Entrance scanner is back online after 42 seconds offline.",
      at: new Date(now - 96 * 60_000).toISOString(),
    },
  ];

  return {
    event, altEvent, users: USERS, agents, attendees, tickets, payments,
    checkIns, securityEvents, tables, notifications, nonces,
  };
}
