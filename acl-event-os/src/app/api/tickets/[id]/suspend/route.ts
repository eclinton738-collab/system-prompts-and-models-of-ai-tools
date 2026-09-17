import { getStore } from "@/lib/server/store";
import { ok, handleError, requirePermission } from "@/lib/server/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({ note: z.string().trim().min(3, "Say why").max(200) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "checkin.override");
    const { id } = await params;
    const { note } = body.parse(await request.json());
    return ok(getStore().suspendTicket(id, note));
  } catch (err) {
    return handleError(err);
  }
}
