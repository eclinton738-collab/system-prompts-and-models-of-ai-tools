import type { Permission } from "../permissions";

/** Admin sidebar. Items are hidden when the signed-in role lacks the permission. */
export const ADMIN_NAV: { href: string; label: string; permission: Permission; sub?: { href: string; label: string }[] }[] = [
  { href: "/admin", label: "Dashboard", permission: "admin.access" },
  { href: "/admin/live", label: "Live console", permission: "live.manage" },
  { href: "/admin/fighters", label: "Fighters", permission: "fighters.manage" },
  { href: "/admin/fights", label: "Fights", permission: "fights.manage" },
  { href: "/admin/events", label: "Events", permission: "events.manage" },
  { href: "/admin/rankings", label: "Rankings", permission: "rankings.manage", sub: [{ href: "/admin/divisions", label: "Divisions" }] },
  { href: "/admin/champions", label: "Champions", permission: "rankings.manage" },
  { href: "/admin/news", label: "News", permission: "content.manage", sub: [{ href: "/admin/tags", label: "Tags" }] },
  { href: "/admin/videos", label: "Videos", permission: "content.manage", sub: [{ href: "/admin/series", label: "Originals series" }] },
  { href: "/admin/photos", label: "Photos", permission: "content.manage", sub: [{ href: "/admin/media-assets", label: "Media assets" }] },
  { href: "/admin/rivalries", label: "Rivalries", permission: "content.manage", sub: [{ href: "/admin/rivalry-moments", label: "Timeline" }] },
  { href: "/admin/tickets", label: "Tickets", permission: "commerce.manage" },
  { href: "/admin/shop", label: "Shop", permission: "commerce.manage", sub: [{ href: "/admin/promo-codes", label: "Promo codes" }] },
  { href: "/admin/users", label: "Users", permission: "users.manage", sub: [{ href: "/admin/messages", label: "Contact messages" }] },
  { href: "/admin/applications", label: "Applications", permission: "applications.manage" },
  { href: "/admin/sponsors", label: "Sponsors", permission: "sponsors.manage", sub: [{ href: "/admin/sponsor-inquiries", label: "Inquiries" }] },
  { href: "/admin/gyms", label: "Gyms", permission: "gyms.manage", sub: [{ href: "/admin/coaches", label: "Coaches" }] },
  { href: "/admin/moderation", label: "Community", permission: "community.moderate", sub: [{ href: "/admin/polls", label: "Polls" }] },
  { href: "/admin/notifications", label: "Notifications", permission: "notifications.send" },
  { href: "/admin/analytics", label: "Analytics", permission: "analytics.view" },
  { href: "/admin/settings", label: "Settings", permission: "settings.manage", sub: [{ href: "/admin/currencies", label: "Currencies" }, { href: "/admin/countries", label: "Countries" }, { href: "/admin/audit", label: "Audit log" }] },
];
