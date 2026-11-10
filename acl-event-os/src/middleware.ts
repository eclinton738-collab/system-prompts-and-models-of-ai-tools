import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional access gate for shared demo deployments.
 *
 * Set ACL_ACCESS_PASSWORD and every page and API call asks for it (HTTP Basic
 * auth — any username, that password). Unset, the app is open, which is right
 * for local development. This is a shared demo password, NOT user
 * authentication; real sign-in replaces it (see README → Going to production).
 */
export function middleware(req: NextRequest) {
  const password = process.env.ACL_ACCESS_PASSWORD;
  if (!password) return NextResponse.next();
  if (req.nextUrl.pathname === "/api/health") return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const given = atob(header.slice(6)).split(":").slice(1).join(":");
      if (given.length === password.length && [...given].reduce((d, c, i) => d | (c.charCodeAt(0) ^ password.charCodeAt(i)), 0) === 0) return NextResponse.next();
    } catch { /* malformed header falls through to the challenge */ }
  }
  return new NextResponse("ACL EVENT OS — access password required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ACL EVENT OS", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
