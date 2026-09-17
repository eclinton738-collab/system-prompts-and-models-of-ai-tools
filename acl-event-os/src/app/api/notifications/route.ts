import { getStore } from "@/lib/server/store";
import { ok, handleError } from "@/lib/server/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(getStore().notifications);
}

const body = z.object({ ids: z.array(z.string()).optional() });

export async function POST(request: Request) {
  try {
    const { ids } = body.parse(await request.json().catch(() => ({})));
    getStore().markNotificationsRead(ids);
    return ok({ read: true });
  } catch (err) {
    return handleError(err);
  }
}
