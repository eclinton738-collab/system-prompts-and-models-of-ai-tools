import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { listFights } from "@/server/services/fights";
import { FightRow } from "@/components/cards";
import { ApiForm } from "@/components/client/ApiForm";
import { EmptyState } from "@/components/ui";
import { fmtDate, fmtEventDate, label, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Fighter portal", robots: { index: false } };
const PIPELINE = ["APPLICATION", "REVIEW", "SCOUTING", "TEST", "CONTRACT", "ACL_FIGHTER"] as const;

export default async function PortalPage() {
  const user = await requireUser("/portal");
  const [app, fighter] = await Promise.all([
    db.application.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { messages: { orderBy: { createdAt: "desc" } } } }),
    user.fighterId ? db.fighter.findUnique({ where: { id: user.fighterId }, select: { id: true, slug: true, firstName: true, lastName: true } }) : null,
  ]);
  const fights = fighter ? await listFights({ fighterId: fighter.id }) : [];
  const upcoming = fights.filter((f) => f.status !== "COMPLETED");
  const stage = app ? PIPELINE.indexOf(app.status as (typeof PIPELINE)[number]) : -1;
  return (
    <div className="container-acl py-6 sm:py-10">
      <p className="eyebrow">Fighter portal</p>
      <h1 className="mb-8 text-4xl sm:text-6xl">{fighter ? `${fighter.firstName} ${fighter.lastName}` : user.name}</h1>
      {!app && !fighter && <EmptyState title="No application on file" body="Apply to join the ACL roster and your status will appear here." action={{ href: "/apply", label: "Become an ACL fighter" }} />}

      {fighter && (
        <div className="mb-12 space-y-8">
          <section aria-labelledby="obl">
            <h2 id="obl" className="mb-4 text-3xl">Upcoming obligations</h2>
            {upcoming.length ? (
              <div className="space-y-4">
                {upcoming.map((f) => (
                  <div key={f.id}>
                    <FightRow fight={f} />
                    <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                      <li className="card p-3"><span className="label">Fight night</span>{fmtEventDate(f.event.startsAt)}<br />{f.event.venue}, {f.event.city}</li>
                      <li className="card p-3"><span className="label">Weigh-in</span>Day before the event. Limit: {f.division.limitLbs ? `${f.division.limitLbs} lbs` : "none"}.</li>
                      <li className="card p-3"><span className="label">Media</span>Press conference and open workout — see <Link className="text-gold underline" href={`/events/${f.event.slug}`}>fight week schedule</Link>.</li>
                    </ul>
                  </div>
                ))}
              </div>
            ) : <p className="card p-4 text-sm text-fog">No bout is currently scheduled. Your matchmaker will contact you with offers.</p>}
          </section>
          <section aria-labelledby="fh"><h2 id="fh" className="mb-4 text-3xl">ACL fight history</h2>{fights.filter((f) => f.status === "COMPLETED").length ? <div className="grid gap-3 lg:grid-cols-2">{fights.filter((f) => f.status === "COMPLETED").map((f) => <FightRow key={f.id} fight={f} />)}</div> : <p className="text-sm text-fog">No completed ACL bouts.</p>}</section>
          <div className="flex flex-wrap gap-3"><Link href={`/fighters/${fighter.slug}`} className="btn btn-white">View public profile</Link><span className="card px-4 py-2.5 text-sm">Contract status: <span className="font-semibold text-win">Active — ACL roster</span></span></div>
        </div>
      )}

      {app && (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-8">
            <section aria-labelledby="st">
              <h2 id="st" className="mb-4 text-3xl">Application status</h2>
              {app.status === "DECLINED" ? <p className="card border-red/50 p-4">Your application was not taken forward this time. You are welcome to re-apply after six months with new footage.</p> : (
                <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {PIPELINE.map((s, i) => <li key={s} aria-current={i === stage ? "step" : undefined} className={`border p-3 ${i < stage ? "border-win/40 bg-win/5" : i === stage ? "border-gold bg-gold/10" : "border-line opacity-50"}`}><span className="display text-2xl">{i < stage ? "✓" : String(i + 1).padStart(2, "0")}</span><p className="display text-lg leading-none">{label(s)}</p>{i === stage && <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-widest text-gold">Current stage</p>}</li>)}
                </ol>
              )}
              <p className="mt-3 text-xs text-fog">Submitted {fmtDate(app.createdAt)} · last updated {timeAgo(app.updatedAt)}</p>
            </section>
            <section aria-labelledby="req">
              <h2 id="req" className="mb-4 text-3xl">Requirements</h2>
              <ul className="grid gap-2 sm:grid-cols-3">
                {[["Required documents", app.documentsReceived, "ID, boxing licence and record verification"], ["Medical clearance", app.medicalCleared, "Annual medical, eye test, bloodwork and brain scan"], ["Contract", app.contractStatus !== "Not issued", app.contractStatus]].map(([t, okv, d]) => (
                  <li key={t as string} className="card p-4"><span className={`chip ${okv ? "chip-gold" : "chip-outline"}`}>{okv ? "Received" : "Outstanding"}</span><p className="display mt-2 text-xl">{t}</p><p className="text-xs text-fog">{d}</p></li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="det" className="card p-4">
              <h2 id="det" className="mb-2 text-2xl">Submitted details</h2>
              <p className="text-sm text-fog">{app.fullName} · {app.city}, {app.countryCode} · {app.weightKg} kg · {app.heightCm} cm · {label(app.stance)} · Record {app.wins}–{app.losses}–{app.draws}{app.gymName ? ` · ${app.gymName}` : ""}</p>
            </section>
          </div>
          <aside>
            <h2 className="mb-4 text-3xl">ACL communications</h2>
            <ul className="space-y-3">
              {app.messages.map((m) => <li key={m.id} className={`card p-3 text-sm ${m.fromStaff ? "border-l-2 border-l-gold" : ""}`}><p className="text-xs uppercase tracking-widest text-fog">{m.fromStaff ? "ACL Scouting" : "You"} · {timeAgo(m.createdAt)}</p><p className="mt-1 whitespace-pre-line">{m.body}</p></li>)}
            </ul>
            <div className="mt-4"><ApiForm endpoint="/api/v1/applications/message" extra={{ applicationId: app.id }} refresh resetOnSuccess submitLabel="Send message" successMessage="Sent." fields={[{ name: "body", label: "Message the scouting team", type: "textarea", required: true, rows: 3 }]} /></div>
          </aside>
        </div>
      )}
    </div>
  );
}
