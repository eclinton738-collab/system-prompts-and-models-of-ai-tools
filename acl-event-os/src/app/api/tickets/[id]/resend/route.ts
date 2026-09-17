import { getStore } from "@/lib/server/store";
import { ok, handleError, requirePermission } from "@/lib/server/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({ via: z.enum(["EMAIL", "SMS", "WHATSAPP"]).default("EMAIL") });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "attendees.resend_ticket");
    const { id } = await params;
    const { via } = body.parse(await request.json().catch(() => ({})));
    return ok(getStore().resendTicket(id, via));
  } catch (err) {
    return handleError(err);
  }
}
