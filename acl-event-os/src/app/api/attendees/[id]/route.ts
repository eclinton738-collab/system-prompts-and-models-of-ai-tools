import { getStore } from "@/lib/server/store";
import { ok, handleError, requirePermission } from "@/lib/server/api";
import { attendeeUpdateSchema } from "@/lib/domain/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "attendees.edit");
    const { id } = await params;
    const input = attendeeUpdateSchema.parse(await request.json());
    return ok(getStore().updateAttendee(id, input));
  } catch (err) {
    return handleError(err);
  }
}
