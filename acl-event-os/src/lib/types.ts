/**
 * Domain model for ACL EVENT OS.
 * These types mirror prisma/schema.prisma one-to-one so the demo store can be
 * swapped for PostgreSQL without touching the UI.
 */

export type Role =
  | "SUPER_ADMIN"
  | "EVENT_MANAGER"
  | "FINANCE"
  | "CHECKIN_STAFF"
  | "TICKET_AGENT"
  | "SECURITY";

export type Permission =
  | "dashboard.view"
  | "tickets.sell"
  | "tickets.manage"
  | "tickets.send"
  | "sales.view"
  | "checkin.scan"
  | "checkin.log"
  | "attendees.view"
  | "attendees.edit"
  | "seating.view"
  | "seating.manage"
  | "payments.view"
  | "payments.manage"
  | "payments.refund"
  | "agents.view"
  | "agents.manage"
  | "marketing.manage"
  | "reports.view"
  | "security.view"
  | "settings.manage";

export interface User {
  id: string;
  name: string;
  title: string;
  role: Role;
  /** Set when the user is a field agent selling through POS. */
  agentId?: string;
}

export type EventStatus = "DRAFT" | "ON_SALE" | "LIVE" | "ENDED";

export interface TicketRules {
  maxPerOrder: number;
  /** Camera scans must carry a valid HMAC signature. Manual entry is unaffected. */
  requireSignedQr: boolean;
  /** A ticket admits once. Kept as data so the rule is visible; cannot be turned on in the UI. */
  allowReentry: false;
  refundsEnabled: boolean;
  salesOpen: boolean;
}

export interface EventRecord {
  id: string;
  name: string;
  status: EventStatus;
  venue: string;
  location: string;
  capacity: number;
  doorsOpenAt: string;
  mainCardAt: string;
  endsAt: string;
  revenueTarget: number;
  refundPolicy: string;
  rules: TicketRules;
}

export type TicketTypeId = "GEN" | "VIP" | "VVIP" | "RNG" | "EX" | "RY";

export interface TicketType {
  id: TicketTypeId;
  eventId: string;
  name: string;
  shortName: string;
  /** ID prefix, e.g. ACL-GEN or ACL-TBL-EX */
  prefix: string;
  serialDigits: number;
  price: number;
  /** Inventory units (seats, or tables for table products). */
  capacity: number;
  isTable: boolean;
  /** Guests admitted per unit (1 for seats). */
  guestsPerUnit: number;
  tier: "standard" | "premium" | "elite";
  perks: string[];
}

export type TicketStatus = "ACTIVE" | "USED" | "REFUNDED" | "VOID" | "SUSPENDED";

export interface Ticket {
  id: string;
  eventId: string;
  typeId: TicketTypeId;
  attendeeId: string;
  paymentId: string;
  status: TicketStatus;
  /** Price actually charged for this ticket (after any promo). */
  pricePaid: number;
  seatId?: string;
  tableId?: string;
  agentId?: string;
  promoCode?: string;
  /** Signed QR payload. Issued by the server only. */
  qrToken: string;
  createdAt: string;
  checkedInAt?: string;
  checkInId?: string;
  suspendedReason?: string;
}

export interface Attendee {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}

export type PaymentMethod = "CARD" | "BANK_TRANSFER" | "USSD" | "CASH_OUTLET" | "POS_AGENT";
export type PaymentStatus = "PAID" | "PENDING" | "FAILED" | "REFUNDED";

export interface Payment {
  id: string;
  eventId: string;
  ticketIds: string[];
  attendeeId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  provider: string;
  agentId?: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  refundReason?: string;
  failureReason?: string;
}

export type ScanResult = "GRANTED" | "REJECTED";

export type ScanReason =
  | "OK"
  | "NOT_FOUND"
  | "MALFORMED"
  | "TAMPERED_QR"
  | "UNSIGNED_QR"
  | "WRONG_EVENT"
  | "EVENT_ENDED"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "REFUNDED"
  | "CANCELLED"
  | "SUSPENDED"
  | "DUPLICATE"
  | "WRONG_GATE";

export type ScanMode = "QR" | "MANUAL";

/** One row per scan attempt — the immutable audit log. */
export interface CheckIn {
  id: string;
  eventId: string;
  /** Resolved ticket, when the payload matched a real record. */
  ticketId?: string;
  /** What the device actually presented (truncated). */
  presented: string;
  result: ScanResult;
  reason: ScanReason;
  message: string;
  mode: ScanMode;
  gateId: string;
  operatorId: string;
  deviceId: string;
  /** Device-reported time from decode to decision. */
  durationMs?: number;
  at: string;
}

export type Severity = "INFO" | "WARNING" | "CRITICAL";

export interface SecurityEvent {
  id: string;
  eventId: string;
  checkInId: string;
  type: ScanReason;
  severity: Severity;
  title: string;
  detail: string;
  ticketRef: string;
  gateId: string;
  operatorId: string;
  deviceId: string;
  at: string;
}

export interface Gate {
  id: string;
  name: string;
  active: boolean;
  allowedTypes: TicketTypeId[];
}

export type SeatStatus = "AVAILABLE" | "RESERVED" | "SOLD";

export interface Seat {
  id: string;
  typeId: TicketTypeId;
  label: string;
  status: SeatStatus;
  ticketId?: string;
  reservedFor?: string;
}

export interface TableRecord {
  id: string;
  typeId: "EX" | "RY";
  seatId: string;
  label: string;
  capacity: number;
  ticketId?: string;
  buyer?: string;
  guests: string[];
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  location: string;
  commissionRate: number;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export type NotificationKind =
  | "SALE"
  | "PAYMENT"
  | "SECURITY"
  | "REFUND"
  | "CAPACITY"
  | "SYSTEM";

export interface Notification {
  id: string;
  kind: NotificationKind;
  severity: Severity;
  title: string;
  body: string;
  ticketId?: string;
  at: string;
  read: boolean;
}

export interface PromoCode {
  code: string;
  percentOff: number;
  maxUses: number;
  uses: number;
  active: boolean;
}

/** Outbound message handed to the messaging provider (demo: logged, never sent). */
export interface OutboundMessage {
  id: string;
  kind: "E_TICKET" | "BROADCAST";
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  to: string;
  subject: string;
  body: string;
  ticketId?: string;
  recipients: number;
  status: "LOGGED_DEMO";
  at: string;
}

export interface Snapshot {
  version: number;
  now: string;
  demo: boolean;
  currentUser: User;
  permissions: Permission[];
  event: EventRecord;
  ticketTypes: TicketType[];
  tickets: Ticket[];
  attendees: Attendee[];
  payments: Payment[];
  checkIns: CheckIn[];
  securityEvents: SecurityEvent[];
  gates: Gate[];
  seats: Seat[];
  tables: TableRecord[];
  agents: Agent[];
  notifications: Notification[];
  promoCodes: PromoCode[];
  messages: OutboundMessage[];
  users: User[];
  rolePermissions: Record<Role, Permission[]>;
  /** Demo mode only: one ticket per scan scenario, for rehearsing the gate. */
  demoKit: DemoKitItem[];
}

export interface DemoKitItem {
  label: string;
  expect: string;
  ticketId: string;
  payload: string;
}

/** What the scanner UI receives back from the server. */
export interface ScanOutcome {
  checkIn: CheckIn;
  ticket?: {
    id: string;
    typeName: string;
    pricePaid: number;
    attendeeName: string;
    paymentStatus: PaymentStatus;
    status: TicketStatus;
    tableLabel?: string;
    seatLabel?: string;
  };
  gateName: string;
  operatorName: string;
  /** Present on duplicates: the scan that originally consumed the ticket. */
  firstScan?: { at: string; gateName: string; operatorName: string; deviceId: string };
  /** Present on WRONG_GATE. */
  redirectTo?: string;
}
