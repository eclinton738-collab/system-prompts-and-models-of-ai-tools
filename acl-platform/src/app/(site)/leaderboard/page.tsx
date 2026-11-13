import type { Metadata } from "next";
import Link from "next/link";
import { pointsLeaderboard, predictionLeaderboard } from "@/server/services/engagement";
import { getCurrentUser } from "@/server/auth";
import { EmptyState, Flag, PageHeader, Tabs } from "@/components/ui";
import { FAN_RANKS } from "@/lib/format";

export const metadata: Metadata = { title: "Fan Leaderboards", description: "ACL fan rankings: fan points and prediction accuracy leaderboards.", alternates: { canonical: "/leaderboard" } };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === "predictions" ? "predictions" : "points";
  const [user, points, preds] = await Promise.all([getCurrentUser(), pointsLeaderboard(50), predictionLeaderboard(50)]);
  return (
    <>
      <PageHeader eyebrow="ACL fan rank" title="Leaderboards" intro="Earn fan points by watching, reading, predicting, following, sharing and showing up." />
      <div className="container-acl py-6 sm:py-10">
        <ol className="mb-8 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          {FAN_RANKS.map((r) => <li key={r.name} className="border border-line p-3"><span className="display block text-xl text-gold">{r.name}</span><span className="text-xs text-fog">{r.min.toLocaleString("en")}+ pts</span></li>)}
        </ol>
        <Tabs base="/leaderboard" active={tab} tabs={[{ key: "points", label: "Fan points" }, { key: "predictions", label: "Predictions" }]} />
        <div className="card mt-5 overflow-x-auto">
          {tab === "points" ? (
            points.length ? (
              <table className="table-acl min-w-[480px]"><thead><tr><th>#</th><th>Fan</th><th>Rank</th><th>Points</th></tr></thead><tbody>
                {points.map((r) => <tr key={r.user.id} className={r.user.id === user?.id ? "bg-gold/10" : ""}><td className="display text-2xl text-red">{r.position}</td><td className="font-semibold"><Flag code={r.user.countryCode} /> {r.user.name}{r.user.id === user?.id && <span className="chip chip-gold ml-2">You</span>}</td><td><span className="chip">{r.rank}</span></td><td className="display text-2xl tabular-nums">{r.points.toLocaleString("en")}</td></tr>)}
              </tbody></table>
            ) : <EmptyState title="No points scored yet" />
          ) : preds.length ? (
            <table className="table-acl min-w-[480px]"><thead><tr><th>#</th><th>Fan</th><th>Correct</th><th>Settled picks</th><th>Accuracy</th></tr></thead><tbody>
              {preds.map((r) => <tr key={r.user.id} className={r.user.id === user?.id ? "bg-gold/10" : ""}><td className="display text-2xl text-red">{r.position}</td><td className="font-semibold"><Flag code={r.user.countryCode} /> {r.user.name}</td><td className="tabular-nums">{r.correct}</td><td className="tabular-nums">{r.settled}</td><td className="display text-2xl tabular-nums">{r.accuracy}%</td></tr>)}
            </tbody></table>
          ) : <EmptyState title="No settled predictions yet" />}
        </div>
        {!user && <p className="mt-6 text-sm text-fog"><Link href="/join" className="text-gold underline">Join ACL</Link> to get on the board.</p>}
      </div>
    </>
  );
}
