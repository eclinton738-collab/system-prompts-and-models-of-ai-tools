import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/session";
import { db } from "@/server/store";

/** Demo role switcher. In production this route is replaced by real sign-in. */
export async function POST(req: Request) {
  const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };
  const user = db().users.find((u) => u.id === userId);
  if (!user) return NextResponse.json({ ok: false, error: "Unknown user" }, { status: 404 });
  const res = NextResponse.json({ ok: true, data: user });
  res.cookies.set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
