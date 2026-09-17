import {
  LayoutDashboard, Ticket, TrendingUp, ScanLine, Users, Grid3x3,
  CreditCard, Store, Megaphone, BarChart3, ShieldAlert, Settings,
} from "lucide-react";
import type { Permission } from "@/lib/domain/permissions";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: React.ElementType;
  permission: Permission;
  /** Shown in the mobile bottom bar. */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard, permission: "dashboard.view", primary: true },
  { href: "/ticketing", label: "Ticketing", short: "Sell", icon: Ticket, permission: "ticketing.view", primary: true },
  { href: "/sales", label: "Sales & Revenue", short: "Sales", icon: TrendingUp, permission: "sales.view" },
  { href: "/check-in", label: "Check-In", short: "Scan", icon: ScanLine, permission: "checkin.scan", primary: true },
  { href: "/attendees", label: "Attendees", short: "People", icon: Users, permission: "attendees.view", primary: true },
  { href: "/seating", label: "Seating & Tables", short: "Seating", icon: Grid3x3, permission: "seating.view" },
  { href: "/payments", label: "Payments", short: "Pay", icon: CreditCard, permission: "payments.view" },
  { href: "/agents", label: "Agents / POS", short: "Agents", icon: Store, permission: "agents.view" },
  { href: "/marketing", label: "Marketing", short: "Marketing", icon: Megaphone, permission: "marketing.view" },
  { href: "/reports", label: "Reports", short: "Reports", icon: BarChart3, permission: "reports.view" },
  { href: "/security", label: "Security", short: "Security", icon: ShieldAlert, permission: "security.view" },
  { href: "/settings", label: "Event Settings", short: "Settings", icon: Settings, permission: "settings.view" },
];
