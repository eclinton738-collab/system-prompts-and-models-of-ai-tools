import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { EmptyState, Stat } from "@/components/ui";
import { fmtDateShort } from "@/lib/format";

export const metadata = { title: "My predictions" };

export default async function MyPredictionsPage() {
  const user = await requireUser("/account/predictions");
  const preds = await db.prediction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { pickFighter: { select: { lastName: true } }, fight: { select: { slug: true, status: true, fighterA: { select: { lastName: true } }, fighterB: { select: { lastName: true } }, event: { select: { name: true, startsAt: true } } } } } });
  const settled = preds.filter((p) => p.correct != null);
  const correct = settled.filter((p) => p.correct).length;
  return (
    <>
      <h1 className="mb-6 text-4xl sm:text-5xl">Prediction history</h1>
      <div className="mb-6 grid grid-cols-3 gap-3 sm:max-w-xl"><Stat label="Picks" value={preds.length} /><Stat label="Correct" value={correct} /><Stat label="Accuracy" value={settled.length ? `${Math.round((correct / settled.length) * 100)}%` : "—"} accent /></div>
      {preds.length ? (
        <div className="card overflow-x-auto"><table className="table-acl min-w-[560px]"><thead><tr><th>Fight</th><th>Your pick</th><th>Method</th><th>Event</th><th>Outcome</th></tr></thead><tbody>
          {preds.map((p) => <tr key={p.id}><td><Link href={`/fights/${p.fight.slug}`} className="font-semibold hover:text-gold">{p.fight.fighterA.lastName} vs {p.fight.fighterB.lastName}</Link></td><td>{p.pickFighter.lastName}</td><td>{p.method ?? "Any"}{p.round ? ` · R${p.round}` : ""}</td><td className="text-fog">{p.fight.event.name} · {fmtDateShort(p.fight.event.startsAt)}</td><td>{p.correct == null ? <span className="chip chip-outline">Open</span> : p.correct ? <span className="chip chip-gold">Correct +60</span> : <span className="chip">Missed</span>}</td></tr>)}
        </tbody></table></div>
      ) : <EmptyState title="No predictions yet" action={{ href: "/predictions", label: "Make your first pick" }} />}
    </>
  );
}
