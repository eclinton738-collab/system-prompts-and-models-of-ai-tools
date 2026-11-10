/**
 * Demo persistence: one in-process store, seeded on first use.
 *
 * This module is the only place that owns state. Everything else goes through
 * src/server/services.ts, whose functions map 1:1 onto the transactions a
 * PostgreSQL/Prisma implementation would run (see prisma/schema.prisma and the
 * README section "Going to production").
 */
import type {
  Agent, Attendee, CheckIn, EventRecord, Gate, Notification, OutboundMessage, Payment, Permission,
  PromoCode, Role, Seat, SecurityEvent, TableRecord, Ticket, TicketType, TicketTypeId, User,
} from "@/lib/types";
import { seed } from "./seed";

export interface Db {
  version: number;
  event: EventRecord;
  otherEvents: { id: string; name: string }[];
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
  seq: { serial: Record<TicketTypeId, number>; txn: number; scan: number; sec: number; att: number; msg: number; ntf: number; agent: number };
}

const g = globalThis as unknown as { __aclDb?: Db };

export function db(): Db {
  return (g.__aclDb ??= seed());
}

export function resetDb() {
  const version = (g.__aclDb?.version ?? 0) + 1;
  g.__aclDb = seed();
  g.__aclDb.version = version;
}

/** Every mutation bumps the version so clients know to refetch. */
export function touch() {
  db().version++;
}
