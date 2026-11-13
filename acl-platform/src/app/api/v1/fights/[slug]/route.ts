import { route, notFound } from "@/server/api";
import { getFight, predictionSplit, totalStats } from "@/server/services/fights";
import { publicFight } from "@/server/serializers";

export const GET = route({}, async ({ params }) => {
  const f = await getFight(params.slug);
  if (!f) notFound("Fight");
  return {
    ...publicFight(f),
    scorecards: f.scorecards.map((c) => ({ judge: c.judge, scoreA: c.scoreA, scoreB: c.scoreB })),
    statistics: { fighterA: totalStats(f.roundStats, f.fighterA.id), fighterB: totalStats(f.roundStats, f.fighterB.id), rounds: f.roundStats.map(({ id: _i, fightId: _f, ...s }) => ({ ...s, fighter: s.fighterId === f.fighterA.id ? "A" : "B" })) },
    fanPredictions: await predictionSplit(f.id, f.fighterA.id),
  };
});
