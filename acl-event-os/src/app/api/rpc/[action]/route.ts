import { NextResponse } from "next/server";
import { ActionError, runAction } from "@/server/actions";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** POST /api/rpc/<action> — validate (Zod) → authorise (role) → execute. */
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  // Resolve everything async *before* touching state so the handler runs as one uninterrupted step.
  const [user, body] = await Promise.all([currentUser(), req.json().catch(() => ({}))]);
  try {
    return NextResponse.json({ ok: true, data: runAction(action, body, user) });
  } catch (err) {
    if (err instanceof ActionError) return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    console.error(`[rpc:${action}]`, err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
