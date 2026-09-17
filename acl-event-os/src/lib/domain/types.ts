/**
 * ACL EVENT OS — domain model.
 *
 * These types are the contract between the data layer (today: in-memory demo
 * store; tomorrow: PostgreSQL via Prisma) and everything above it. The shapes
 * mirror `prisma/schema.prisma` one-for-one so the swap is mechanical.
 */

export type TicketTypeCode =
  | "GENERAL"
  | "VIP"
  | "VVIP"
  | "RINGSIDE"
  | "EXECUTIVE"
  | "ROYAL";

/** Lifecycle of the ticket itself, independent of how it was paid for. */
export type TicketStatus =
  | "VALID"
  | "USED"
  | "REFUNDED"
  | "SUSPENDED"
  | "EXPIRED"
  | "CANCELLED";

export type PaymentStatus = "PAID" | "PENDING" | "FAILED" | "REFUNDED";

export type PaymentMethod =
  | "CARD"
  | "BANK_TRANSFER"
  | "USSD"
  | "POS_AGENT"
  | "CASH_OUTLET";

export type SalesChannel = "WEBSITE" | "POS_AGENT" | "BANK_TRANSFER" | "USSD" | "CASH";

export type CheckInResult = "GRANTED" | "REJECTED";

/**
 * Every rejection carries a specific reason. The operator at the gate is never
 * shown a bare "invalid" — they are told exactly what to do about it.
 */
export type RejectionReason =
  | "TICKET_NOT_FOUND"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "TICKET_REFUNDED"
  | "WRONG_EVENT"
  | "TICKET_EXPIRED"
  | "ALREADY_USED"
  | "TICKET_SUSPENDED"
  | "TICKET_CANCELLED"
  | "INVALID_SIGNATURE"
  | "MALFORMED_PAYLOAD"
  | "EVENT_NOT_OPEN";

export type SecurityEventKind =
  | "DUPLICATE_SCAN"
  | "INVALID_TICKET"
  | "UNPAID_TICKET"
  | "REFUNDED_TICKET"
  | "WRONG_EVENT"
  | "FORGED_PAYLOAD"
  | "SUSPENDED_TICKET"
  | "VALID_CHECK_IN";

export type SecuritySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";

export type Role =
  | "SUPER_ADMIN"
  | "EVENT_MANAGER"
  | "FINANCE"
  | "CHECK_IN_STAFF"
  | "TICKET_AGENT"
  | "SECURITY";

export type EventStatus = "DRAFT" | "ON_SALE" | "LIVE" | "COMPLETED" | "CANCELLED";

export type SeatSectionCode =
  | "GENERAL"
  | "VIP"
  | "VVIP"
  | "RINGSIDE"
  | "EXECUTIVE"
  | "ROYAL"
  | "STAGE"
  | "ENTRANCE"
  | "EXIT";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  initials: string;
  active: boolean;
  lastActiveAt?: string;
}

export interface Gate {
  id: string;
  name: string;
  /** Which ticket types this gate is allowed to admit. Empty = all. */
  allowedTypes: TicketTypeCode[];
  active: boolean;
}

export interface TicketTypeDef {
  code: TicketTypeCode;
  name: string;
  /** Price in kobo-free whole Naira. */
  price: number;
  /** Inventory allocated to this tier. */
  allocation: number;
  /** Seats granted per ticket — tables seat a party. */
  seatsPerTicket: number;
  /** ID segment: ACL-<idSegment>-000123 */
  idSegment: string;
  description: string;
  perks: string[];
  premium: boolean;
}

export interface AclEvent {
  id: string;
  name: string;
  status: EventStatus;
  /** ISO timestamp of doors/start. */
  startsAt: string;
  venue: string;
  location: string;
  capacity: number;
  projectedRevenue: number;
  currency: "NGN";
  gates: Gate[];
  /** Operational rules the check-in engine enforces. */
  rules: EventRules;
  refundPolicy: string;
}

export interface EventRules {
  /** Reject scans before this many minutes prior to start. */
  doorsOpenMinutesBefore: number;
  /** Tickets stop being admissible this many minutes after start. */
  entryClosesMinutesAfter: number;
  /** A ticket may be admitted only once. Always true in production. */
  singleUseTickets: boolean;
  /** Allow staff to admit a PENDING payment at the gate (never silently). */
  allowPendingPaymentOverride: boolean;
  /** Refunds allowed up to N hours before the event. */
  refundWindowHours: number;
}

export interface Attendee {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  type: TicketTypeCode;
  attendeeId: string;
  /** Denormalised for list rendering; authoritative name lives on Attendee. */
  attendeeName: string;
  price: number;
  status: TicketStatus;
  paymentId: string;
  paymentStatus: PaymentStatus;
  channel: SalesChannel;
  agentId?: string;
  seatId?: string;
  tableId?: string;
  purchasedAt: string;
  /** Set exactly once, by the atomic check-in transaction. */
  usedAt?: string;
  usedGateId?: string;
  usedOperatorId?: string;
  /** Monotonic guard for optimistic concurrency. */
  version: number;
}

export interface Payment {
  id: string;
  reference: string;
  ticketIds: string[];
  attendeeId: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  settledAt?: string;
  agentId?: string;
  /** Populated by the payment provider adapter in production. */
  providerRef?: string;
  failureReason?: string;
  refundedAt?: string;
}

export interface CheckIn {
  id: string;
  ticketId: string;
  eventId: string;
  attendeeName: string;
  ticketType: TicketTypeCode | "UNKNOWN";
  gateId: string;
  gateName: string;
  operatorId: string;
  operatorName: string;
  deviceId: string;
  scannedAt: string;
  result: CheckInResult;
  reason?: RejectionReason;
  /** Milliseconds the validation round-trip took. */
  durationMs: number;
}

export interface SecurityEvent {
  id: string;
  kind: SecurityEventKind;
  severity: SecuritySeverity;
  ticketId: string;
  eventId: string;
  gateId: string;
  gateName: string;
  operatorId: string;
  operatorName: string;
  deviceId: string;
  at: string;
  result: CheckInResult;
  detail: string;
  /** For duplicate scans: where and when the ticket was first admitted. */
  firstScanAt?: string;
  firstScanGate?: string;
  firstScanOperator?: string;
}

export interface Seat {
  id: string;
  section: SeatSectionCode;
  label: string;
  ticketId?: string;
  reservedFor?: string;
}

export interface SeatSection {
  code: SeatSectionCode;
  name: string;
  capacity: number;
  ticketType?: TicketTypeCode;
  /** Layout box on the 100x100 map grid. */
  x: number;
  y: number;
  w: number;
  h: number;
  tone: "red" | "gold" | "blue" | "violet" | "neutral" | "green";
}

export interface EventTable {
  id: string;
  type: Extract<TicketTypeCode, "EXECUTIVE" | "ROYAL">;
  label: string;
  capacity: number;
  buyerName?: string;
  buyerPhone?: string;
  ticketId?: string;
  paymentStatus?: PaymentStatus;
  guests: TableGuest[];
  reserved: boolean;
  reservedNote?: string;
}

export interface TableGuest {
  id: string;
  name: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  location: string;
  commissionRate: number;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  createdAt: string;
}

export type NotificationKind =
  | "TICKET_SOLD"
  | "PAYMENT_RECEIVED"
  | "SECURITY_ALERT"
  | "REFUND"
  | "CAPACITY_WARNING"
  | "SYSTEM";

export interface AclNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  /** Security alerts outrank everything else in the notification centre. */
  priority: "CRITICAL" | "HIGH" | "NORMAL";
  href?: string;
}

/** Shape returned by the check-in API — the only source of scan truth. */
export interface ValidationOutcome {
  result: CheckInResult;
  reason?: RejectionReason;
  /** Operator-facing explanation. Never just "invalid". */
  message: string;
  headline: string;
  ticket?: Ticket;
  attendee?: Attendee;
  checkIn?: CheckIn;
  duplicate?: {
    firstScanAt: string;
    firstScanGate: string;
    firstScanOperator: string;
  };
  securityEvent?: SecurityEvent;
  durationMs: number;
}
