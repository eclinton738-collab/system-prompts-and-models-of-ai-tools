import { route, ApiError } from "@/server/api";
import { getAiProvider } from "@/server/integrations/ai";
import { getFighterCards } from "@/server/services/fighters";
import { publicFighter } from "@/server/serializers";

export const GET = route({ limit: 30 }, async ({ req }) => {
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 200);
  if (!q) throw new ApiError(422, "validation", "Pass a question in ?q=");
  const ai = getAiProvider();
  const rec = await ai.recommend(q);
  const fighters = rec.fighterIds.length ? await getFighterCards({ id: { in: rec.fighterIds } }) : [];
  return { provider: ai.name, heuristic: ai.isHeuristic, interpreted: rec.interpreted, note: rec.note, fighters: fighters.map(publicFighter) };
});
