import { z } from "zod";
import { TICKET_TYPE_ORDER } from "./catalog";

/** Nigerian mobile numbers: 0803..., +234803..., 234803... */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .regex(/^(\+?234|0)[789][01]\d{8}$/, "Enter a valid Nigerian phone number (e.g. 0803 123 4567)");

export const ticketTypeSchema = z.enum(
  TICKET_TYPE_ORDER as [(typeof TICKET_TYPE_ORDER)[number], ...typeof TICKET_TYPE_ORDER],
);

export const paymentMethodSchema = z.enum([
  "CARD",
  "BANK_TRANSFER",
  "USSD",
  "POS_AGENT",
  "CASH_OUTLET",
]);

export const purchaseSchema = z.object({
  fullName: z.string().trim().min(3, "Enter the buyer's full name").max(80),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email address"),
  type: ticketTypeSchema,
  quantity: z.coerce.number().int().min(1, "At least 1").max(20, "Maximum 20 per transaction"),
  method: paymentMethodSchema,
  /** Set when the sale originates from a POS agent. Server binds it to the ticket. */
  agentId: z.string().optional(),
  note: z.string().max(240).optional(),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const scanSchema = z.object({
  /** Raw QR payload, or a bare ticket ID for manual entry. */
  payload: z.string().trim().min(3, "Enter a ticket ID"),
  gateId: z.string().min(1),
  operatorId: z.string().min(1),
  deviceId: z.string().min(1),
  source: z.enum(["CAMERA", "MANUAL"]).default("CAMERA"),
});

export type ScanInput = z.infer<typeof scanSchema>;

export const attendeeUpdateSchema = z.object({
  name: z.string().trim().min(3, "Name is too short").max(80),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email address"),
});

export const refundSchema = z.object({
  ticketId: z.string().min(1),
  reason: z.string().trim().min(5, "Give a reason for the refund").max(240),
});

export const tableBookingSchema = z.object({
  tableId: z.string().min(1),
  buyerName: z.string().trim().min(3, "Enter the buyer or company name").max(80),
  buyerPhone: phoneSchema,
  buyerEmail: z.string().trim().email("Enter a valid email address"),
  method: paymentMethodSchema,
  guests: z.array(z.string().trim().max(80)).default([]),
});

export const agentSchema = z.object({
  name: z.string().trim().min(3, "Enter the agent's name").max(80),
  phone: phoneSchema,
  location: z.string().trim().min(2, "Where does this agent sell?").max(80),
  commissionRate: z.coerce.number().min(0).max(0.25),
});

export const reserveSeatsSchema = z.object({
  section: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(60),
  note: z.string().trim().min(2, "Who is this held for?").max(120),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(3).max(120),
  startsAt: z.string().min(1),
  venue: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  capacity: z.coerce.number().int().min(1).max(200_000),
  projectedRevenue: z.coerce.number().int().min(0),
  status: z.enum(["DRAFT", "ON_SALE", "LIVE", "COMPLETED", "CANCELLED"]),
  refundPolicy: z.string().trim().max(600),
  rules: z.object({
    doorsOpenMinutesBefore: z.coerce.number().int().min(0).max(720),
    entryClosesMinutesAfter: z.coerce.number().int().min(0).max(1440),
    singleUseTickets: z.boolean(),
    allowPendingPaymentOverride: z.boolean(),
    refundWindowHours: z.coerce.number().int().min(0).max(2160),
  }),
  prices: z.record(z.string(), z.coerce.number().int().min(0)),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

/** Normalise a Nigerian number to +234 form for storage/dedupe. */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+234${digits}`;
}
