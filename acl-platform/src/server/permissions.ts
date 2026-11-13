import type { Role } from "@prisma/client";

/** Role-based access control. Every admin screen and API mutation checks one permission. */
export const PERMISSIONS = [
  "admin.access",
  "fighters.manage",
  "fights.manage",
  "events.manage",
  "live.manage",
  "rankings.manage",
  "content.manage",
  "commerce.manage",
  "users.manage",
  "applications.manage",
  "sponsors.manage",
  "gyms.manage",
  "community.moderate",
  "notifications.send",
  "analytics.view",
  "settings.manage",
  "audit.view",
  "media.download",
  "portal.fighter",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "settings.manage" && p !== "audit.view"),
  EVENT_MANAGER: ["admin.access", "events.manage", "fights.manage", "live.manage", "commerce.manage", "media.download"],
  EDITOR: ["admin.access", "content.manage", "community.moderate", "notifications.send", "media.download"],
  SCOUT: ["admin.access", "applications.manage", "gyms.manage", "fighters.manage"],
  JOURNALIST: ["media.download"],
  MEDIA_PARTNER: ["media.download"],
  SPONSOR: ["media.download"],
  COACH: ["portal.fighter"],
  FIGHTER: ["portal.fighter"],
  FAN: [],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}
