/**
 * Deterministic demo dataset for "Lion's Den: The First Roar".
 *
 * Nothing here is displayed directly: every number on screen is derived from
 * these records by src/lib/metrics.ts. The seed is constructed so the derived
 * figures land on the event brief (327 sold, ₦8.73M, 186 checked in, +12% / +18%
 * week on week) — change a record and every KPI moves with it.
 */
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import type {
  Agent, Attendee, CheckIn, EventRecord, Gate, Notification, OutboundMessage, Payment,
  PaymentMethod, PromoCode, ScanReason, Seat, SecurityEvent, Severity, TableRecord, Ticket,
  TicketType, TicketTypeId, User,
} from "@/lib/types";
import { DEMO_START_MS } from "./clock";
import { issueQrToken } from "./qr";
import type { Db } from "./store";

export const EVENT_ID = "evt_lions_den_1";
export const OTHER_EVENT_ID = "evt_lions_den_2";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Chinedu", "Ngozi", "Emeka", "Adaeze", "Obinna", "Chioma", "Ikenna", "Ifeoma", "Uche", "Amarachi", "Tobenna", "Nkechi", "Kelechi", "Oluchi", "Somto", "Chiamaka", "Tunde", "Folake", "Segun", "Yetunde", "Musa", "Aisha", "Ibrahim", "Halima", "Efe", "Osas", "Blessing", "Samuel", "Grace", "David", "Favour", "Daniel", "Precious", "Victor", "Joy", "Kingsley", "Ebuka", "Nnamdi", "Zainab", "Bola", "Chukwuma", "Ugochi", "Ifeanyi", "Onyeka", "Kosi", "Dubem", "Ada", "Nonso"];
const LAST = ["Okafor", "Eze", "Nwosu", "Okonkwo", "Obi", "Nwachukwu", "Onyeka", "Ibe", "Uzor", "Anyanwu", "Chukwu", "Okeke", "Emenike", "Nnadi", "Ogbonna", "Adeyemi", "Bakare", "Ogunleye", "Balogun", "Lawal", "Bello", "Abubakar", "Osagie", "Igwe", "Madu", "Ekwueme", "Njoku", "Onuoha", "Agu", "Iroha", "Kalu", "Ukaegbu", "Nwankwo", "Ezeh", "Orji", "Udeh"];
const GROUPS = ["Ariaria Traders Union", "Enyimba Motors", "Okpara Holdings", "Abia Legal Chambers", "Ngwa Road Merchants", "Eastern Steel Works", "Umuahia Capital Partners", "Aba Garment Guild", "Osisioma Logistics", "Azikiwe Road Investors"];

export const TICKET_TYPES: TicketType[] = [
  { id: "GEN", eventId: EVENT_ID, name: "General", shortName: "General", prefix: "ACL-GEN", serialDigits: 6, price: 10_000, capacity: 320, isTable: false, guestsPerUnit: 1, tier: "standard", perks: ["Arena entry", "General admission stands"] },
  { id: "VIP", eventId: EVENT_ID, name: "VIP", shortName: "VIP", prefix: "ACL-VIP", serialDigits: 6, price: 25_000, capacity: 100, isTable: false, guestsPerUnit: 1, tier: "standard", perks: ["Reserved VIP block", "VIP entrance", "Fast-lane bar"] },
  { id: "VVIP", eventId: EVENT_ID, name: "VVIP", shortName: "VVIP", prefix: "ACL-VVIP", serialDigits: 6, price: 50_000, capacity: 40, isTable: false, guestsPerUnit: 1, tier: "premium", perks: ["Elevated cageside view", "VVIP lounge", "Fighter walkout access"] },
  { id: "RNG", eventId: EVENT_ID, name: "Ringside", shortName: "Ringside", prefix: "ACL-RNG", serialDigits: 6, price: 100_000, capacity: 20, isTable: false, guestsPerUnit: 1, tier: "premium", perks: ["Front-row cageside", "Hosted service", "Meet the main card"] },
  { id: "EX", eventId: EVENT_ID, name: "Executive Table", shortName: "Executive", prefix: "ACL-TBL-EX", serialDigits: 3, price: 250_000, capacity: 12, isTable: true, guestsPerUnit: 6, tier: "elite", perks: ["Private table for 6", "Bottle service", "Dedicated host"] },
  { id: "RY", eventId: EVENT_ID, name: "Royal Table", shortName: "Royal", prefix: "ACL-TBL-RY", serialDigits: 3, price: 500_000, capacity: 8, isTable: true, guestsPerUnit: 10, tier: "elite", perks: ["Cageside table for 10", "Premium bottle service", "Post-fight champions' reception"] },
];

/** Paid tickets by purchase window. Sums: 327 tickets, ₦8,730,000. */
const PLAN: Record<"earlier" | "prevWeek" | "lastWeek", Partial<Record<TicketTypeId, number>>> = {
  earlier: { GEN: 145, VIP: 42, VVIP: 23, RNG: 4, EX: 4, RY: 3 },
  prevWeek: { GEN: 30, VIP: 16, VVIP: 2, RNG: 2 },
  lastWeek: { GEN: 38, VIP: 14, VVIP: 2, RNG: 1, EX: 1 },
};
const PENDING: Partial<Record<TicketTypeId, number>> = { GEN: 7, VIP: 3, VVIP: 1, EX: 1, RY: 1 };
const FAILED: Partial<Record<TicketTypeId, number>> = { GEN: 4, VIP: 1 };
const REFUNDED: Partial<Record<TicketTypeId, number>> = { GEN: 3, VIP: 2, EX: 1 };
/** First serial per type, chosen so the newest ticket matches the event brief (e.g. ACL-GEN-000521). */
const FIRST_SERIAL: Record<TicketTypeId, number> = { GEN: 295, VIP: 405, VVIP: 274, RNG: 112, EX: 1, RY: 1 };

type Outcome = "PAID" | "PENDING" | "FAILED" | "REFUNDED";
interface Draft { typeId: TicketTypeId; at: number; outcome: Outcome; pin?: string; name?: string; method?: PaymentMethod; agentId?: string }

export function ticketId(type: TicketType, serial: number) {
  return `${type.prefix}-${String(serial).padStart(type.serialDigits, "0")}`;
}

export function seed(): Db {
  const rnd = mulberry32(26092026);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const between = (a: number, b: number) => a + rnd() * (b - a);
  const NOW = DEMO_START_MS;
  const iso = (ms: number) => new Date(ms).toISOString();
  const typeById = Object.fromEntries(TICKET_TYPES.map((t) => [t.id, t])) as Record<TicketTypeId, TicketType>;

  const event: EventRecord = {
    id: EVENT_ID,
    name: "Lion’s Den: The First Roar",
    status: "LIVE",
    venue: "Indoor Arena",
    location: "Aba, Abia State",
    capacity: 500,
    doorsOpenAt: "2026-09-26T17:00:00+01:00",
    mainCardAt: "2026-09-26T21:00:00+01:00",
    endsAt: "2026-09-27T01:00:00+01:00",
    revenueTarget: 14_500_000,
    refundPolicy: "Refunds are available until 48 hours before doors open. Tickets that have been scanned at a gate cannot be refunded. Table bookings are refundable less a 10% holding fee.",
    rules: { maxPerOrder: 10, requireSignedQr: true, allowReentry: false, refundsEnabled: true, salesOpen: true },
  };

  const users: User[] = [
    { id: "usr_clinton", name: "Clinton Edward", title: "Administrator", role: "SUPER_ADMIN" },
    { id: "usr_manager", name: "Amaka Obi", title: "Event Manager", role: "EVENT_MANAGER" },
    { id: "usr_finance", name: "Tunde Bakare", title: "Finance Lead", role: "FINANCE" },
    ...[1, 2, 3, 4, 5, 6].map((n): User => ({ id: `usr_staff_0${n}`, name: `ACL Staff 0${n}`, title: "Gate Operator", role: "CHECKIN_STAFF" })),
    { id: "usr_agent", name: "Chidi Okeke", title: "Field Agent · AGT-001", role: "TICKET_AGENT", agentId: "AGT-001" },
    { id: "usr_security", name: "Emeka Nwosu", title: "Head of Security", role: "SECURITY" },
  ];

  const gates: Gate[] = [
    { id: "G1", name: "Main Entrance", active: true, allowedTypes: ["GEN", "VIP", "VVIP", "RNG", "EX", "RY"] },
    { id: "G2", name: "Main Gate", active: true, allowedTypes: ["GEN", "VIP", "VVIP", "RNG", "EX", "RY"] },
    { id: "G3", name: "VIP Entrance", active: true, allowedTypes: ["VIP", "VVIP", "RNG", "EX", "RY"] },
    { id: "G4", name: "Ringside & Tables", active: true, allowedTypes: ["RNG", "EX", "RY"] },
  ];
  /** Which operator works which gate on the night. */
  const post: Record<string, string[]> = { G1: ["usr_staff_01", "usr_staff_02"], G2: ["usr_staff_03", "usr_staff_04"], G3: ["usr_staff_05"], G4: ["usr_staff_06"] };
  const deviceOf = (userId: string) => `SCN-${userId.slice(-2)}`;

  const agents: Agent[] = [
    { id: "AGT-001", name: "Chidi Okeke", phone: "0803 555 0114", location: "Ariaria Market, Aba", commissionRate: 0.05, status: "ACTIVE", createdAt: iso(NOW - 50 * DAY) },
    { id: "AGT-002", name: "Blessing Uzor", phone: "0806 555 0127", location: "Aba Road, Umuahia", commissionRate: 0.05, status: "ACTIVE", createdAt: iso(NOW - 48 * DAY) },
    { id: "AGT-003", name: "Ifeanyi Madu", phone: "0813 555 0139", location: "Douglas Road, Owerri", commissionRate: 0.05, status: "ACTIVE", createdAt: iso(NOW - 45 * DAY) },
    { id: "AGT-004", name: "Osas Igbinedion", phone: "0809 555 0142", location: "GRA Phase 2, Port Harcourt", commissionRate: 0.06, status: "ACTIVE", createdAt: iso(NOW - 41 * DAY) },
    { id: "AGT-005", name: "Nkechi Agu", phone: "0705 555 0158", location: "Ogui Road, Enugu", commissionRate: 0.05, status: "ACTIVE", createdAt: iso(NOW - 38 * DAY) },
    { id: "AGT-006", name: "Segun Lawal", phone: "0802 555 0163", location: "Upper Iweka, Onitsha", commissionRate: 0.05, status: "SUSPENDED", createdAt: iso(NOW - 30 * DAY) },
  ];
  const sellingAgents = ["AGT-001", "AGT-001", "AGT-001", "AGT-002", "AGT-002", "AGT-003", "AGT-004", "AGT-005", "AGT-006"];

  // ---- 1. Draft every purchase attempt -----------------------------------
  const drafts: Draft[] = [];
  const windows = {
    earlier: [Date.parse("2026-08-03T09:00:00+01:00"), NOW - 14 * DAY - HOUR] as const,
    prevWeek: [NOW - 13.9 * DAY, NOW - 7.05 * DAY] as const,
    lastWeek: [NOW - 6.95 * DAY, NOW - 6 * HOUR] as const,
  };
  for (const w of ["earlier", "prevWeek", "lastWeek"] as const) {
    for (const [typeId, n] of Object.entries(PLAN[w]) as [TicketTypeId, number][]) {
      for (let i = 0; i < n; i++) {
        const [a, b] = windows[w];
        // Sales accelerate toward fight night.
        const at = w === "earlier" ? a + Math.pow(rnd(), 0.65) * (b - a) : between(a, b);
        drafts.push({ typeId, at, outcome: "PAID" });
      }
    }
  }
  // Pin the newest sale of each headline type to the IDs in the event brief.
  const pinLatest = (typeId: TicketTypeId, at: number, patch: Partial<Draft>) => {
    const d = drafts.filter((x) => x.typeId === typeId && x.at >= windows.lastWeek[0]).sort((x, y) => y.at - x.at)[0];
    Object.assign(d, { at, ...patch });
  };
  pinLatest("GEN", NOW - 14 * MIN, { pin: "ACL-GEN-000521", method: "POS_AGENT", agentId: "AGT-001", name: "Chinedu Okafor" });
  pinLatest("VIP", NOW - 3 * HOUR, { pin: "ACL-VIP-000482", method: "CARD", name: "John Doe" });
  pinLatest("VVIP", NOW - 26 * HOUR, { pin: "ACL-VVIP-000301", method: "CARD", name: "Adaeze Nwachukwu" });
  pinLatest("EX", NOW - 5 * HOUR, { pin: "ACL-TBL-EX-007", method: "BANK_TRANSFER", name: "Kingsley Group" });

  const extra = (plan: Partial<Record<TicketTypeId, number>>, outcome: Outcome, a: number, b: number) => {
    for (const [typeId, n] of Object.entries(plan) as [TicketTypeId, number][]) {
      for (let i = 0; i < n; i++) drafts.push({ typeId, at: between(a, b), outcome });
    }
  };
  extra(PENDING, "PENDING", NOW - 4 * DAY, NOW - 27 * HOUR);
  extra(FAILED, "FAILED", NOW - 6 * DAY, NOW - 28 * HOUR);
  extra(REFUNDED, "REFUNDED", windows.earlier[0] + 5 * DAY, windows.earlier[1] - 3 * DAY);
  drafts.sort((a, b) => a.at - b.at);

  // ---- 2. Seats -----------------------------------------------------------
  const seats: Seat[] = [];
  const tables: TableRecord[] = [];
  const rowLen: Record<TicketTypeId, number> = { GEN: 20, VIP: 10, VVIP: 10, RNG: 10, EX: 12, RY: 8 };
  for (const t of TICKET_TYPES) {
    for (let i = 0; i < t.capacity; i++) {
      const id = `${t.id}-${String(i + 1).padStart(3, "0")}`;
      const row = String.fromCharCode(65 + Math.floor(i / rowLen[t.id]));
      const label = t.isTable ? `${t.shortName} Table ${i + 1}` : `${t.id === "GEN" ? "GA" : t.id} ${row}${String((i % rowLen[t.id]) + 1).padStart(2, "0")}`;
      seats.push({ id, typeId: t.id, label, status: "AVAILABLE" });
      if (t.isTable) tables.push({ id, typeId: t.id as "EX" | "RY", seatId: id, label, capacity: t.guestsPerUnit, guests: [] });
    }
  }
  const reserve = (ids: string[], note: string) => ids.forEach((id) => { const s = seats.find((x) => x.id === id)!; s.status = "RESERVED"; s.reservedFor = note; });
  reserve(["VIP-091", "VIP-092", "VIP-093", "VIP-094"], "Sponsor allocation");
  reserve(["GEN-301", "GEN-302", "GEN-303", "GEN-304", "GEN-305", "GEN-306"], "Accredited media");
  reserve(["RNG-019", "RNG-020"], "Fighter families");
  reserve(["RY-008"], "ACL Chairman’s table");
  // Fill each section in a shuffled order so the map looks like real demand.
  const freeBySection = Object.fromEntries(TICKET_TYPES.map((t) => {
    const free = seats.filter((s) => s.typeId === t.id && s.status === "AVAILABLE");
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    return [t.id, t.isTable ? free.sort((a, b) => a.id.localeCompare(b.id)) : free];
  })) as Record<TicketTypeId, Seat[]>;

  // ---- 3. Materialise tickets / attendees / payments ----------------------
  const tickets: Ticket[] = [];
  const attendees: Attendee[] = [];
  const payments: Payment[] = [];
  const serial = { ...FIRST_SERIAL };
  const methods: PaymentMethod[] = ["CARD", "CARD", "CARD", "CARD", "CARD", "CARD", "CARD", "BANK_TRANSFER", "BANK_TRANSFER", "BANK_TRANSFER", "BANK_TRANSFER", "USSD", "USSD", "CASH_OUTLET", "CASH_OUTLET", "POS_AGENT", "POS_AGENT", "POS_AGENT", "POS_AGENT"];
  const usedNames = new Set<string>();
  const personName = () => {
    for (;;) { const n = `${pick(FIRST)} ${pick(LAST)}`; if (!usedNames.has(n)) { usedNames.add(n); return n; } }
  };
  const phone = () => `0${pick(["803", "806", "813", "816", "703", "706", "805", "807", "809", "902"])} ${String(Math.floor(between(100, 999)))} ${String(Math.floor(between(1000, 9999)))}`;
  let groupIdx = 0;
  let txn = 4520;
  const ref = () => `ACLPAY-${Math.floor(rnd() * 0xffffffff).toString(16).toUpperCase().padStart(8, "0")}`;

  for (const d of drafts) {
    const type = typeById[d.typeId];
    const id = ticketId(type, serial[d.typeId]++);
    const name = d.name ?? (type.isTable ? GROUPS[groupIdx++ % GROUPS.length] : personName());
    const slug = name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
    const att: Attendee = { id: `att_${String(attendees.length + 1).padStart(4, "0")}`, name, phone: phone(), email: `${slug}@${type.isTable ? "example.ng" : pick(["gmail.com", "yahoo.com", "outlook.com"])}`, createdAt: iso(d.at) };
    attendees.push(att);

    let method = d.method ?? (type.isTable ? pick<PaymentMethod>(["BANK_TRANSFER", "BANK_TRANSFER", "CARD"]) : pick(methods));
    if (d.outcome === "PENDING") method = pick<PaymentMethod>(["BANK_TRANSFER", "BANK_TRANSFER", "USSD"]);
    if (d.outcome === "FAILED") method = pick<PaymentMethod>(["CARD", "CARD", "USSD"]);
    const agentId = method === "POS_AGENT" ? d.agentId ?? pick(sellingAgents) : undefined;
    const payId = `TXN-${String(txn++).padStart(6, "0")}`;
    const pay: Payment = {
      id: payId, eventId: EVENT_ID, ticketIds: [id], attendeeId: att.id, amount: type.price, method,
      status: d.outcome, reference: ref(), provider: "demo-gateway", agentId, createdAt: iso(d.at),
    };
    if (d.outcome === "PAID" || d.outcome === "REFUNDED") pay.paidAt = iso(d.at + (method === "BANK_TRANSFER" ? between(10, 90) * MIN : 20_000));
    if (d.outcome === "REFUNDED") { pay.refundedAt = iso(d.at + between(2, 9) * DAY); pay.refundReason = pick(["Customer can no longer attend", "Duplicate purchase", "Travel plans changed"]); }
    if (d.outcome === "FAILED") pay.failureReason = pick(["Card declined by issuer", "Insufficient funds", "USSD session timed out"]);
    payments.push(pay);

    const holdsSeat = d.outcome === "PAID" || d.outcome === "PENDING";
    const seat = holdsSeat ? freeBySection[d.typeId].shift() : undefined;
    if (seat) { seat.status = "SOLD"; seat.ticketId = id; }
    const table = seat && type.isTable ? tables.find((t) => t.seatId === seat.id)! : undefined;
    if (table) {
      table.ticketId = id; table.buyer = name;
      table.guests = Array.from({ length: Math.floor(between(2, type.guestsPerUnit + 1)) }, () => personName());
    }
    tickets.push({
      id, eventId: EVENT_ID, typeId: d.typeId, attendeeId: att.id, paymentId: payId,
      status: d.outcome === "REFUNDED" ? "REFUNDED" : d.outcome === "FAILED" ? "VOID" : "ACTIVE",
      pricePaid: type.price, seatId: seat?.id, tableId: table?.id, agentId,
      qrToken: issueQrToken(EVENT_ID, id), createdAt: iso(d.at),
    });
  }

  const tById = new Map(tickets.map((t) => [t.id, t]));
  const pById = new Map(payments.map((p) => [p.id, p]));
  const isPaid = (t: Ticket) => pById.get(t.paymentId)!.status === "PAID";
  // ACL-GEN-000398 is the duplicate-scan example in the brief: it must be a paid ticket.
  if (!isPaid(tById.get("ACL-GEN-000398")!)) throw new Error("seed: ACL-GEN-000398 must be paid — adjust seed");

  const suspended = tickets.find((t) => t.typeId === "GEN" && isPaid(t) && t.id > "ACL-GEN-000330" && t.id !== "ACL-GEN-000398")!;
  suspended.status = "SUSPENDED";
  suspended.suspendedReason = "Reported stolen by purchaser — pending re-issue";

  // ---- 4. Fight night so far: 186 admitted, 24 in the last hour -----------
  const checkIns: CheckIn[] = [];
  const securityEvents: SecurityEvent[] = [];
  const DOORS = Date.parse(event.doorsOpenAt);
  const gateFor = (typeId: TicketTypeId) => typeId === "GEN" ? pick(["G1", "G1", "G2"]) : typeId === "VIP" ? pick(["G3", "G3", "G1"]) : typeId === "VVIP" ? "G3" : "G4";
  const gateName = (id: string) => gates.find((g) => g.id === id)!.name;
  const userName = (id: string) => users.find((u) => u.id === id)!.name;
  let scanSeq = 0;
  const pendingScans: Omit<CheckIn, "id">[] = [];
  const admit = (t: Ticket, at: number, gateId = gateFor(t.typeId), operatorId = pick(post[gateId])) => {
    pendingScans.push({ eventId: EVENT_ID, ticketId: t.id, presented: t.id, result: "GRANTED", reason: "OK", message: "Access granted", mode: rnd() < 0.06 ? "MANUAL" : "QR", gateId, operatorId, deviceId: deviceOf(operatorId), durationMs: Math.round(between(700, 1700)), at: iso(at) });
    t.status = "USED"; t.checkedInAt = iso(at);
  };
  const reject = (at: number, reason: ScanReason, severity: Severity, presented: string, message: string, gateId: string, operatorId: string, t?: Ticket, mode: "QR" | "MANUAL" = "QR") => {
    pendingScans.push({ eventId: EVENT_ID, ticketId: t?.id, presented, result: "REJECTED", reason, message, mode, gateId, operatorId, deviceId: deviceOf(operatorId), durationMs: Math.round(between(700, 1500)), at: iso(at) });
    return severity;
  };

  const hhmm = (h: number, m: number, s = 0) => Date.parse(`2026-09-26T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}+01:00`);
  admit(tById.get("ACL-VIP-000482")!, hhmm(19, 42, 6), "G1", "usr_staff_02");
  admit(tById.get("ACL-VVIP-000301")!, hhmm(19, 30, 21), "G3", "usr_staff_05");
  admit(tById.get("ACL-GEN-000398")!, hhmm(18, 14, 37), "G2", "usr_staff_04");
  const keepUnused = new Set(["ACL-GEN-000521", "ACL-TBL-EX-007"]);
  const pool = tickets.filter((t) => t.status === "ACTIVE" && isPaid(t) && !keepUnused.has(t.id));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const arrivals = pool.slice(0, 183);
  arrivals.slice(0, 22).forEach((t) => admit(t, between(NOW - 59 * MIN, NOW - 2 * MIN)));
  arrivals.slice(22).forEach((t) => admit(t, between(DOORS + MIN, NOW - 61 * MIN)));

  const usedGen = arrivals.find((t) => t.typeId === "GEN")!;
  const pendingGen = tickets.find((t) => t.typeId === "GEN" && pById.get(t.paymentId)!.status === "PENDING")!;
  const refundedVip = tickets.find((t) => t.typeId === "VIP" && t.status === "REFUNDED")!;
  const anyGen = pool.slice(183).find((t) => t.typeId === "GEN")!;
  const sev = new Map<number, Severity>();
  const rej = (...a: Parameters<typeof reject>) => { sev.set(pendingScans.length, reject(...a)); };
  rej(hhmm(19, 41, 12), "DUPLICATE", "CRITICAL", "ACL-GEN-000398", "Ticket already used at Main Gate, 6:14 PM", "G2", "usr_staff_04", tById.get("ACL-GEN-000398"));
  rej(hhmm(19, 36, 40), "NOT_FOUND", "WARNING", "ACL-VIP-009821", "No ticket with this ID has ever been issued", "G3", "usr_staff_05", undefined, "MANUAL");
  rej(hhmm(19, 18, 3), "PAYMENT_PENDING", "WARNING", pendingGen.id, "Payment has not been confirmed", "G1", "usr_staff_01", pendingGen);
  rej(hhmm(18, 52, 48), "DUPLICATE", "CRITICAL", usedGen.id, "Ticket already used", "G1", "usr_staff_02", usedGen);
  rej(hhmm(18, 31, 15), "REFUNDED", "WARNING", refundedVip.id, "Ticket was refunded and is no longer valid", "G3", "usr_staff_05", refundedVip);
  rej(hhmm(18, 7, 29), "TAMPERED_QR", "CRITICAL", "ACL1.evt_lions_den_1.ACL-RNG-000118.AAAAAAAAAAAAAAAAAAAAAA", "QR signature does not match — code was altered or forged", "G2", "usr_staff_03");
  rej(hhmm(17, 44, 51), "WRONG_GATE", "INFO", anyGen.id, "General tickets are not admitted at VIP Entrance — redirect to Main Entrance", "G3", "usr_staff_05", anyGen);
  rej(hhmm(17, 26, 9), "WRONG_EVENT", "WARNING", "ACL-GEN-900214", "Ticket belongs to Lion’s Den II: Enugu Uprising", "G1", "usr_staff_01");

  const titles: Partial<Record<ScanReason, string>> = { DUPLICATE: "Duplicate QR attempt", NOT_FOUND: "Invalid ticket", PAYMENT_PENDING: "Unpaid ticket presented", REFUNDED: "Refunded ticket presented", TAMPERED_QR: "Tampered QR code", WRONG_GATE: "Wrong gate", WRONG_EVENT: "Ticket from another event" };
  pendingScans
    .map((s, i) => ({ s, severity: sev.get(i) }))
    .sort((a, b) => a.s.at.localeCompare(b.s.at))
    .forEach(({ s, severity }) => {
      const ci: CheckIn = { id: `scan_${String(++scanSeq).padStart(5, "0")}`, ...s };
      checkIns.push(ci);
      if (s.result === "GRANTED") tById.get(s.ticketId!)!.checkInId = ci.id;
      else securityEvents.push({ id: `sec_${String(securityEvents.length + 1).padStart(4, "0")}`, eventId: EVENT_ID, checkInId: ci.id, type: s.reason, severity: severity!, title: titles[s.reason] ?? s.reason, detail: s.message, ticketRef: s.ticketId ?? s.presented.slice(0, 40), gateId: s.gateId, operatorId: s.operatorId, deviceId: s.deviceId, at: s.at });
    });

  // ---- 5. A second event, to prove tickets cannot cross events ------------
  const otherAtt: Attendee = { id: "att_9001", name: "Ugochi Kalu", phone: "0803 555 0199", email: "ugochi.kalu@gmail.com", createdAt: iso(NOW - 3 * DAY) };
  const otherPay: Payment = { id: "TXN-900214", eventId: OTHER_EVENT_ID, ticketIds: ["ACL-GEN-900214"], attendeeId: otherAtt.id, amount: 10_000, method: "CARD", status: "PAID", reference: "ACLPAY-0E21F9A4", provider: "demo-gateway", createdAt: iso(NOW - 3 * DAY), paidAt: iso(NOW - 3 * DAY) };
  const otherTicket: Ticket = { id: "ACL-GEN-900214", eventId: OTHER_EVENT_ID, typeId: "GEN", attendeeId: otherAtt.id, paymentId: otherPay.id, status: "ACTIVE", pricePaid: 10_000, qrToken: issueQrToken(OTHER_EVENT_ID, "ACL-GEN-900214"), createdAt: iso(NOW - 3 * DAY) };

  // ---- 6. Notifications, promo codes, outbox ------------------------------
  const n = (minsAgo: number, kind: Notification["kind"], severity: Severity, title: string, body: string, tid?: string, read = false): Notification =>
    ({ id: `ntf_${minsAgo}_${kind}`, kind, severity, title, body, ticketId: tid, at: iso(NOW - minsAgo * MIN), read });
  const vip = typeById.VIP;
  const vipHeld = seats.filter((s) => s.typeId === "VIP" && s.status !== "AVAILABLE").length;
  const notifications: Notification[] = [
    n(1.3, "SECURITY", "CRITICAL", "Duplicate QR scan", "ACL-GEN-000398 was presented again at Main Gate. Entry rejected.", "ACL-GEN-000398"),
    n(6, "SECURITY", "WARNING", "Invalid ticket", "ACL-VIP-009821 does not exist. Rejected at VIP Entrance."),
    n(14, "SALE", "INFO", "New ticket sold", "ACL-GEN-000521 · General · ₦10,000 via agent AGT-001", "ACL-GEN-000521"),
    n(52, "CAPACITY", "WARNING", "Capacity warning", `VIP is ${Math.round((vipHeld / vip.capacity) * 100)}% allocated — ${vip.capacity - vipHeld} seats left.`),
    n(180, "PAYMENT", "INFO", "Payment received", "₦25,000 card payment for ACL-VIP-000482 (John Doe).", "ACL-VIP-000482", true),
    n(300, "PAYMENT", "INFO", "Payment received", "₦250,000 bank transfer confirmed for ACL-TBL-EX-007 (Kingsley Group).", "ACL-TBL-EX-007", true),
    n(1500, "REFUND", "INFO", "Ticket refunded", `${refundedVip.id} refunded to customer.`, refundedVip.id, true),
    n(1700, "SYSTEM", "INFO", "System notice", "Scanner SCN-03 re-synced at Main Gate. All devices online.", undefined, true),
  ];
  const promoCodes: PromoCode[] = [
    { code: "FIRSTROAR10", percentOff: 10, maxUses: 100, uses: 0, active: true },
    { code: "FIGHTFAM", percentOff: 15, maxUses: 40, uses: 0, active: true },
    { code: "EARLYBIRD", percentOff: 20, maxUses: 50, uses: 0, active: false },
  ];
  const messages: OutboundMessage[] = ["ACL-GEN-000521", "ACL-VIP-000482", "ACL-TBL-EX-007"].map((id, i) => {
    const t = tById.get(id)!; const a = attendees.find((x) => x.id === t.attendeeId)!;
    return { id: `msg_${String(i + 1).padStart(4, "0")}`, kind: "E_TICKET", channel: "EMAIL", to: a.email, subject: `Your ACL e-ticket ${id}`, body: `E-ticket ${id} for ${event.name}`, ticketId: id, recipients: 1, status: "LOGGED_DEMO", at: t.createdAt };
  });

  void gateName; void userName;
  return {
    version: 1,
    event,
    otherEvents: [{ id: OTHER_EVENT_ID, name: "Lion’s Den II: Enugu Uprising" }],
    ticketTypes: TICKET_TYPES.map((t) => ({ ...t })),
    tickets: [...tickets, otherTicket],
    attendees: [...attendees, otherAtt],
    payments: [...payments, otherPay],
    checkIns, securityEvents, gates, seats, tables, agents, notifications, promoCodes, messages, users,
    rolePermissions: structuredClone(DEFAULT_ROLE_PERMISSIONS),
    seq: { serial, txn, scan: scanSeq, sec: securityEvents.length, att: attendees.length, msg: messages.length, ntf: 0, agent: agents.length },
  };
}
