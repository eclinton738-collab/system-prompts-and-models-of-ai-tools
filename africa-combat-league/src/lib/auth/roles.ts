export const staffRoles = ["super_admin", "promotions", "talent", "media", "academies"] as const;
export const memberRoles = ["fighter", "member", "sponsor", "fan"] as const;
export const allRoles = [...staffRoles, ...memberRoles] as const;

export type RoleKey = (typeof allRoles)[number];
export type StaffRole = (typeof staffRoles)[number];

export function isStaff(roles: RoleKey[]): boolean {
  return roles.some((role) => (staffRoles as readonly string[]).includes(role));
}

export function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && (allRoles as readonly string[]).includes(value);
}
