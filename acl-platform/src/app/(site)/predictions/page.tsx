import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { fighterName } from "@/server/services/fighters";
import { listFights, predictionSplit } from "@/server/services/fights";
import { predictionLeaderboard } from "@/server/services/engagement";
import { PredictionWidget } from "@/components/client/Engage";
import { EmptyState, Flag, PageHeader } from "@/components/ui";
import { fmtDateShort } from "@/lib/format";

export const metadata: Metadata = { title: "Fan Predictions", description: "Call the winner, method and round of every ACL fight. Free to play, for fan points and bragging rights only.", alternates: { canonical: "/predictions" } };

export default async function PredictionsPage() {
  const user = await getCurrentUser();
  const [fights, board] = await Promise.all([listFights({ status: "SCHEDULED" }), predictionLeaderboard(10)]);
  const [splits, mine] = await Promise.all([
    Promise.all(fights.map((f) => predictionSplit(f.id, f.fighterAId))),
    user ? db.prediction.findMany({ where: { userId: user.id, fightId: { in: fights.map((f) => f.id) } } }) : [],
  ]);
  return (
    <>
      <PageHeader eyebrow="Fan predictions" title="Who wins?" intro="Pick the winner, the method and the round. Correct calls earn fan points and move you up the leaderboard. This is a free fan game — not betting." />
      <div className="container-acl grid gap-10 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {fights.length ? fights.map((f, i) => (
            <div key={f.id}>
              <p className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-widest text-fog">
                <Link href={`/fights/${f.slug}`} className="font-semibold text-bone hover:text-gold">{f.fighterA.lastName} vs {f.fighterB.lastName} →</Link>
                <span>{f.event.name} · {fmtDateShort(f.event.startsAt)}</span>
              </p>
              <PredictionWidget fightId={f.id} a={{ id: f.fighterA.id, name: fighterName(f.fighterA) }} b={{ id: f.fighterB.id, name: fighterName(f.fighterB) }} rounds={f.rounds} split={splits[i]} mine={mine.find((m) => m.fightId === f.id) ?? null} open />
            </div>
          )) : <EmptyState title="No fights open for predictions" body="Predictions open as soon as a fight is announced." action={{ href: "/news", label: "Latest announcements" }} />}
        </div>
        <aside>
          <h2 className="mb-3 text-2xl">Top predictors</h2>
          {board.length ? (
            <ol className="divide-y divide-line border-y border-line">
              {board.map((r) => (
                <li key={r.user.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="display w-7 text-2xl text-red">{r.position}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold"><Flag code={r.user.countryCode} /> {r.user.name}</span>
                  <span className="text-fog">{r.correct}/{r.settled} · {r.accuracy}%</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-fog">No settled predictions yet.</p>}
          <Link href="/leaderboard" className="btn btn-ghost btn-sm mt-4">Full leaderboards</Link>
        </aside>
      </div>
    </>
  );
}
