import type { Permission, Role } from "./types";

export const ALL_PERMISSIONS: { id: Permission; label: string; group: string }[] = [
  { id: "dashboard.view", label: "View dashboard", group: "Operations" },
  { id: "sales.view", label: "View sales & revenue", group: "Operations" },
  { id: "reports.view", label: "View & export reports", group: "Operations" },
  { id: "tickets.sell", label: "Sell tickets", group: "Ticketing" },
  { id: "tickets.send", label: "Send e-tickets", group: "Ticketing" },
  { id: "tickets.manage", label: "Suspend / reinstate tickets", group: "Ticketing" },
  { id: "checkin.scan", label: "Scan & admit", group: "Check-in" },
  { id: "checkin.log", label: "View check-in log", group: "Check-in" },
  { id: "security.view", label: "View security events", group: "Check-in" },
  { id: "attendees.view", label: "View attendees", group: "Attendees" },
  { id: "attendees.edit", label: "Edit attendees", group: "Attendees" },
  { id: "seating.view", label: "View seating map", group: "Seating" },
  { id: "seating.manage", label: "Reserve seats & tables", group: "Seating" },
  { id: "payments.view", label: "View payments", group: "Finance" },
  { id: "payments.manage", label: "Confirm / fail payments", group: "Finance" },
  { id: "payments.refund", label: "Issue refunds", group: "Finance" },
  { id: "agents.view", label: "View agents", group: "Agents" },
  { id: "agents.manage", label: "Manage agents", group: "Agents" },
  { id: "marketing.manage", label: "Promo codes & broadcasts", group: "Marketing" },
  { id: "settings.manage", label: "Event settings", group: "Admin" },
];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  EVENT_MANAGER: "Event Manager",
  FINANCE: "Finance",
  CHECKIN_STAFF: "Check-in Staff",
  TICKET_AGENT: "Ticket Agent",
  SECURITY: "Security",
};

export const ROLES = Object.keys(ROLE_LABELS) as Role[];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map((p) => p.id),
  EVENT_MANAGER: ALL_PERMISSIONS.map((p) => p.id).filter(
    (p) => p !== "settings.manage" && p !== "payments.refund",
  ),
  FINANCE: [
    "dashboard.view",
    "sales.view",
    "reports.view",
    "payments.view",
    "payments.manage",
    "payments.refund",
    "attendees.view",
    "agents.view",
  ],
  CHECKIN_STAFF: ["checkin.scan", "checkin.log", "attendees.view"],
  TICKET_AGENT: ["tickets.sell", "tickets.send", "attendees.view", "seating.view"],
  SECURITY: ["checkin.scan", "checkin.log", "security.view", "attendees.view", "seating.view"],
};

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Any one of these grants access. */
  anyOf: Permission[];
}

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard", anyOf: ["dashboard.view"] },
  { href: "/ticketing", label: "Ticketing", icon: "Ticket", anyOf: ["tickets.sell"] },
  { href: "/sales", label: "Sales & Revenue", icon: "TrendingUp", anyOf: ["sales.view"] },
  { href: "/check-in", label: "Check-In", icon: "ScanLine", anyOf: ["checkin.scan", "checkin.log"] },
  { href: "/attendees", label: "Attendees", icon: "Users", anyOf: ["attendees.view"] },
  { href: "/seating", label: "Seating & Tables", icon: "Armchair", anyOf: ["seating.view"] },
  { href: "/payments", label: "Payments", icon: "CreditCard", anyOf: ["payments.view"] },
  { href: "/agents", label: "Agents / POS", icon: "Store", anyOf: ["agents.view"] },
  { href: "/marketing", label: "Marketing", icon: "Megaphone", anyOf: ["marketing.manage"] },
  { href: "/reports", label: "Reports", icon: "FileBarChart", anyOf: ["reports.view"] },
  { href: "/settings", label: "Event Settings", icon: "Settings", anyOf: ["settings.manage"] },
];

export function can(perms: Permission[], ...anyOf: Permission[]) {
  return anyOf.some((p) => perms.includes(p));
}

export function navFor(perms: Permission[]) {
  return NAV.filter((n) => can(perms, ...n.anyOf));
}
