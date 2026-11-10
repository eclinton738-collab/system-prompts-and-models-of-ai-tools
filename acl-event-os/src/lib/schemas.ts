/** Zod schemas shared by forms (client) and the API (server). */
import { z } from "zod";

const typeId = z.enum(["GEN", "VIP", "VVIP", "RNG", "EX", "RY"]);
const method = z.enum(["CARD", "BANK_TRANSFER", "USSD", "CASH_OUTLET", "POS_AGENT"]);
const name = z.string().trim().min(2, "Enter the full name").max(80);
const phone = z.string().trim().regex(/^(\+?234|0)[\d\s-]{9,13}$/, "Enter a valid Nigerian phone number");
const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const id = z.string().min(1).max(64);

export const purchaseSchema = z.object({
  typeId,
  quantity: z.coerce.number().int().min(1, "At least 1").max(20),
  name, phone, email, method,
  agentId: z.string().optional(),
  promoCode: z.string().trim().toUpperCase().max(24).optional(),
  tableId: z.string().optional(),
  guests: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  simulateDecline: z.boolean().optional(),
});
export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const scanSchema = z.object({
  payload: z.string().min(1, "Enter a ticket ID").max(300),
  gateId: id,
  deviceId: z.string().regex(/^[A-Z0-9-]{4,24}$/),
  mode: z.enum(["QR", "MANUAL"]),
  durationMs: z.number().int().min(0).max(120_000).optional(),
});

export const attendeeSchema = z.object({ attendeeId: id, name, phone, email });
export const agentSchema = z.object({
  name, phone,
  location: z.string().trim().min(2, "Enter a location").max(80),
  commissionRate: z.coerce.number().min(0).max(0.3),
});
export const promoSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/, "4–20 letters or digits"),
  percentOff: z.coerce.number().int().min(1).max(100),
  maxUses: z.coerce.number().int().min(1).max(10_000),
});
export const broadcastSchema = z.object({
  segment: z.enum(["ALL_PAID", "NOT_CHECKED_IN", "PREMIUM", "PENDING_PAYMENT"]),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  subject: z.string().trim().min(3, "Add a subject").max(120),
  body: z.string().trim().min(10, "Write a message of at least 10 characters").max(1000),
});
export const eventSchema = z.object({
  name: z.string().trim().min(3).max(120),
  venue: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(80),
  capacity: z.coerce.number().int().min(1).max(100_000),
  doorsOpenAt: z.string().min(10),
  mainCardAt: z.string().min(10),
  endsAt: z.string().min(10),
  revenueTarget: z.coerce.number().int().min(0),
  status: z.enum(["DRAFT", "ON_SALE", "LIVE", "ENDED"]),
  refundPolicy: z.string().trim().max(1000),
});
const permission = z.string().regex(/^[a-z]+\.[a-z]+$/);

/** name → input schema for every mutation the API accepts. */
export const actionSchemas = {
  "checkin.scan": scanSchema,
  "tickets.purchase": purchaseSchema,
  "tickets.send": z.object({ ticketId: id, channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]) }),
  "tickets.suspend": z.object({ ticketId: id, reason: z.string().trim().min(3, "Give a reason").max(200) }),
  "tickets.reinstate": z.object({ ticketId: id }),
  "attendees.update": attendeeSchema,
  "payments.confirm": z.object({ paymentId: id }),
  "payments.fail": z.object({ paymentId: id, reason: z.string().trim().min(3).max(200) }),
  "payments.refund": z.object({ paymentId: id, reason: z.string().trim().min(3, "Give a reason").max(200) }),
  "seats.reserve": z.object({ seatIds: z.array(id).min(1).max(50), note: z.string().trim().min(2, "Say who this is held for").max(80) }),
  "seats.release": z.object({ seatIds: z.array(id).min(1).max(50) }),
  "tables.guests": z.object({ tableId: id, guests: z.array(z.string().trim().min(1).max(80)).max(12) }),
  "agents.create": agentSchema,
  "agents.update": agentSchema.partial().extend({ agentId: id, status: z.enum(["ACTIVE", "SUSPENDED"]).optional() }),
  "promos.create": promoSchema,
  "promos.toggle": z.object({ code: z.string(), active: z.boolean() }),
  "marketing.broadcast": broadcastSchema,
  "notifications.read": z.object({ id: z.string().optional() }),
  "settings.event": eventSchema,
  "settings.prices": z.object({ prices: z.record(typeId, z.coerce.number().int().min(0).max(100_000_000)) }),
  "settings.gate": z.object({ gateId: id.optional(), name: z.string().trim().min(2).max(40), active: z.boolean(), allowedTypes: z.array(typeId).min(1) }),
  "settings.rules": z.object({ maxPerOrder: z.coerce.number().int().min(1).max(20), requireSignedQr: z.boolean(), refundsEnabled: z.boolean(), salesOpen: z.boolean() }),
  "settings.permissions": z.object({ role: z.enum(["EVENT_MANAGER", "FINANCE", "CHECKIN_STAFF", "TICKET_AGENT", "SECURITY"]), permissions: z.array(permission) }),
  "settings.reset": z.object({}),
} as const;

export type ActionName = keyof typeof actionSchemas;
export type ActionInput<A extends ActionName> = z.input<(typeof actionSchemas)[A]>;
