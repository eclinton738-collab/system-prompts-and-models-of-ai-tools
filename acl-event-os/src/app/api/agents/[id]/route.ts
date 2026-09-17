import { getStore } from "@/lib/server/store";
import { ok, handleError, requirePermission } from "@/lib/server/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "agents.manage");
    const { id } = await params;
    const { status } = body.parse(await request.json());
    return ok(getStore().setAgentStatus(id, status));
  } catch (err) {
    return handleError(err);
  }
}
