import type { RoleKey } from "@/lib/auth/roles";

/**
 * Admin sections mirror the ACL subsidiaries. `roles` lists who may open a
 * section; super_admin can open everything. `built` pages exist today, the
 * rest render "Coming soon" inside the admin shell.
 */
export type AdminItem = { key: string; path: string; built?: boolean };
export type AdminSection = { key: string; roles: RoleKey[]; items: AdminItem[] };

export const adminSections: AdminSection[] = [
  {
    key: "promotions",
    roles: ["promotions"],
    items: [
      { key: "events", path: "/admin/promotions/events" },
      { key: "ticketing", path: "/admin/promotions/ticketing" },
      { key: "ppv", path: "/admin/promotions/pay-per-view" },
      { key: "sponsors", path: "/admin/promotions/sponsors" },
    ],
  },
  {
    key: "talent",
    roles: ["talent"],
    items: [
      { key: "fighters", path: "/admin/talent/fighters" },
      { key: "rankings", path: "/admin/talent/rankings" },
      { key: "applications", path: "/admin/talent/applications" },
    ],
  },
  {
    key: "media",
    roles: ["media"],
    items: [
      { key: "news", path: "/admin/media/news" },
      { key: "video", path: "/admin/media/video" },
      { key: "shop", path: "/admin/media/shop" },
    ],
  },
  {
    key: "academies",
    roles: ["academies"],
    items: [
      { key: "lions_den", path: "/admin/academies/lions-den" },
      { key: "memberships", path: "/admin/academies/memberships" },
      { key: "franchise", path: "/admin/academies/franchise" },
    ],
  },
  {
    key: "system",
    roles: [], // super_admin only
    items: [
      { key: "settings", path: "/admin/settings", built: true },
      { key: "users", path: "/admin/users", built: true },
      { key: "audit_log", path: "/admin/audit-log", built: true },
    ],
  },
];

export function canAccessSection(section: AdminSection, roles: RoleKey[]): boolean {
  return roles.includes("super_admin") || section.roles.some((role) => roles.includes(role));
}

export function findAdminItem(path: string) {
  for (const section of adminSections) {
    const item = section.items.find((entry) => entry.path === path);
    if (item) return { section, item };
  }
  return undefined;
}
