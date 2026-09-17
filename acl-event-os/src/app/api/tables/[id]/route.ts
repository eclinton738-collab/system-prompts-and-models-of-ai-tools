import { getStore } from "@/lib/server/store";
import { ok, handleError, requirePermission } from "@/lib/server/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({ note: z.string().trim().min(2, "Who is this held for?").max(120) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "seating.reserve");
    const { id } = await params;
    const { note } = body.parse(await request.json());
    return ok(getStore().reserveTable(id, note));
  } catch (err) {
    return handleError(err);
  }
}
