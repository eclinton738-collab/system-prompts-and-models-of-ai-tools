import { NextResponse } from "next/server";
import { currentUser } from "@/server/session";
import { buildSnapshot } from "@/server/snapshot";
import { db } from "@/server/store";

export const dynamic = "force-dynamic";

/** GET /api/state?v=<known version> → 204 when nothing changed, else the full read model. */
export async function GET(req: Request) {
  const user = await currentUser();
  const known = new URL(req.url).searchParams.get("v");
  if (known && Number(known) === db().version && new URL(req.url).searchParams.get("u") === user.id) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(buildSnapshot(user), { headers: { "Cache-Control": "no-store" } });
}
