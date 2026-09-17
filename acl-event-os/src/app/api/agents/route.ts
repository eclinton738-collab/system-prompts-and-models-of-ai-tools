import { getStore } from "@/lib/server/store";
import { ok, handleError, requirePermission } from "@/lib/server/api";
import { agentSchema } from "@/lib/domain/schemas";
import { agentPerformance } from "@/lib/domain/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  return ok(agentPerformance(store.agents, store.tickets()));
}

export async function POST(request: Request) {
  try {
    requirePermission(request, "agents.manage");
    const input = agentSchema.parse(await request.json());
    return ok(getStore().createAgent(input), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
