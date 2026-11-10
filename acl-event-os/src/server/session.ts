/**
 * DEMO AUTHENTICATION — not for production.
 * The acting user is read from a cookie so the role switcher can demonstrate
 * role-based access. Replace `currentUser` with a real session lookup
 * (NextAuth / Clerk / your IdP); everything downstream already authorises
 * against the returned user's role.
 */
import { cookies } from "next/headers";
import type { User } from "@/lib/types";
import { db } from "./store";

export const SESSION_COOKIE = "acl_user";

export async function currentUser(): Promise<User> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  const d = db();
  return d.users.find((u) => u.id === id) ?? d.users[0];
}
