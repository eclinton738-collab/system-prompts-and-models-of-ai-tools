import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness probe for hosting platforms. Exposes nothing about the event. */
export function GET() {
  return NextResponse.json({ ok: true });
}
