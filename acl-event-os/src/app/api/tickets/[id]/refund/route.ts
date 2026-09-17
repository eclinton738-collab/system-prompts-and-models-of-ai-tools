import { getStore } from "@/lib/server/store";
import { ok, handleError, requirePermission, actorFrom } from "@/lib/server/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({ reason: z.string().trim().min(5, "Give a reason for the refund").max(240) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "payments.refund");
    const { userId } = actorFrom(request);
    const { id } = await params;
    const { reason } = body.parse(await request.json());
    const store = getStore();
    const actor = store.user(userId)?.name ?? "ACL Operations";
    return ok(store.refund(id, reason, actor));
  } catch (err) {
    return handleError(err);
  }
}
