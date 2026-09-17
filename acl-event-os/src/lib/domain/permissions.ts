import type { Role } from "./types";

/**
 * Capability-based access control. UI hides what a role cannot do and the API
 * re-checks on every mutating route — the client is never the gate.
 */
export const PERMISSIONS = [
  "dashboard.view",
  "ticketing.view",
  "ticketing.sell",
  "sales.view",
  "checkin.scan",
  "checkin.view_log",
  "checkin.override",
  "attendees.view",
  "attendees.edit",
  "attendees.resend_ticket",
  "seating.view",
  "seating.reserve",
  "payments.view",
  "payments.refund",
  "agents.view",
  "agents.manage",
  "marketing.view",
  "reports.view",
  "reports.export",
  "security.view",
  "settings.view",
  "settings.edit",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  EVENT_MANAGER: [
    "dashboard.view",
    "ticketing.view",
    "ticketing.sell",
    "sales.view",
    "checkin.scan",
    "checkin.view_log",
    "checkin.override",
    "attendees.view",
    "attendees.edit",
    "attendees.resend_ticket",
    "seating.view",
    "seating.reserve",
    "payments.view",
    "agents.view",
    "agents.manage",
    "marketing.view",
    "reports.view",
    "reports.export",
    "security.view",
    "settings.view",
  ],
  FINANCE: [
    "dashboard.view",
    "sales.view",
    "payments.view",
    "payments.refund",
    "attendees.view",
    "reports.view",
    "reports.export",
    "agents.view",
  ],
  CHECK_IN_STAFF: ["checkin.scan", "checkin.view_log", "attendees.view"],
  TICKET_AGENT: ["ticketing.view", "ticketing.sell", "attendees.view", "sales.view"],
  SECURITY: ["checkin.view_log", "security.view", "attendees.view", "dashboard.view"],
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  EVENT_MANAGER: "Event Manager",
  FINANCE: "Finance",
  CHECK_IN_STAFF: "Check-In Staff",
  TICKET_AGENT: "Ticket Agent",
  SECURITY: "Security",
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}
