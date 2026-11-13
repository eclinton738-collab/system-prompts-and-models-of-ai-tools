import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { ApiForm } from "@/components/client/ApiForm";
import { ActionButton } from "@/components/client/ActionButton";
import { age, flag, fmtDate, label, timeAgo } from "@/lib/format";

export const metadata = { title: "Application" };
const PIPELINE = ["APPLICATION", "REVIEW", "SCOUTING", "TEST", "CONTRACT", "ACL_FIGHTER"] as const;
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : null);

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("applications.manage");
  const app = await db.application.findUnique({ where: { id: (await params).id }, include: { messages: { orderBy: { createdAt: "desc" } }, user: { select: { email: true, role: true, id: true } } } });
  if (!app) notFound();
  const i = PIPELINE.indexOf(app.status as (typeof PIPELINE)[number]);
  const next = i >= 0 && i < PIPELINE.length - 1 ? PIPELINE[i + 1] : null;
  const ep = `/api/v1/admin/applications/${app.id}`;
  return (
    <div className="max-w-5xl">
      <p className="mb-2 text-xs uppercase tracking-widest text-fog"><Link href="/admin/applications" className="hover:text-gold">Applications</Link> / {app.fullName}</p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-4xl sm:text-5xl">{app.fullName}</h1><p className="mt-1"><span className="chip chip-gold">{label(app.status)}</span> <span className="text-sm text-fog">Applied {fmtDate(app.createdAt)}</span></p></div>
        <div className="flex flex-wrap gap-2">
          {next && <ActionButton endpoint={ep} method="PATCH" body={{ status: next }} label={`Advance to ${label(next)} →`} className="btn btn-red btn-sm" confirm={`Move ${app.fullName} to ${label(next)}? The applicant is notified.`} />}
          {i > 0 && <ActionButton endpoint={ep} method="PATCH" body={{ status: PIPELINE[i - 1] }} label={`← Back to ${label(PIPELINE[i - 1])}`} />}
          {app.status !== "DECLINED" ? <ActionButton endpoint={ep} method="PATCH" body={{ status: "DECLINED" }} label="Decline" confirm="Decline this application? The applicant is notified." className="btn btn-sm border border-red/60 text-red" /> : <ActionButton endpoint={ep} method="PATCH" body={{ status: "REVIEW" }} label="Reopen" />}
        </div>
      </div>
      {app.status === "ACL_FIGHTER" && <p className="mt-4 border border-gold/40 bg-gold/10 p-3 text-sm text-gold-soft">Signed. Next: <Link href="/admin/fighters/new" className="underline">create the fighter profile</Link>, then link it to the account ({app.user.email}) under <Link href={`/admin/users/${app.user.id}`} className="underline">Users</Link> to unlock their fighter portal.</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-2xl">Profile</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[["Age", `${age(app.dateOfBirth)}`], ["From", `${flag(app.countryCode)} ${app.city}`], ["Weight", `${app.weightKg} kg`], ["Height", `${app.heightCm} cm`], ["Reach", app.reachCm ? `${app.reachCm} cm` : "—"], ["Stance", label(app.stance)], ["Record", `${app.wins}–${app.losses}–${app.draws}`], ["Gym", app.gymName ?? "—"], ["Coach", app.coachName ?? "—"], ["Phone", app.phone], ["Email", app.email]].map(([k, v]) => <div key={k}><dt className="text-xs uppercase tracking-widest text-fog">{k}</dt><dd className="break-words font-semibold">{v}</dd></div>)}
          </dl>
          <h3 className="mb-1 mt-4 text-lg">Experience</h3><p className="whitespace-pre-line text-sm text-bone/85">{app.experience}</p>
          <h3 className="mb-1 mt-4 text-lg">Footage & photos</h3>
          <ul className="space-y-1 text-sm">{[...app.videoLinks, ...app.photoLinks].map((u) => <li key={u} className="break-all">{safeUrl(u) ? <a href={u} target="_blank" rel="noopener noreferrer nofollow" className="text-gold underline">{u}</a> : <span className="text-fog">{u}</span>}</li>)}</ul>
        </section>
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 text-2xl">Checks & internal notes</h2>
            <ApiForm endpoint={ep} method="PATCH" refresh submitLabel="Save" successMessage="Saved." initial={{ documentsReceived: app.documentsReceived, medicalCleared: app.medicalCleared, contractStatus: app.contractStatus, scoutNotes: app.scoutNotes ?? "" }}
              fields={[{ name: "documentsReceived", label: "Required documents received", type: "checkbox", half: true }, { name: "medicalCleared", label: "Medical clearance complete", type: "checkbox", half: true }, { name: "contractStatus", label: "Contract status (shown to applicant)" }, { name: "scoutNotes", label: "Scout notes (internal — never shown to the applicant)", type: "textarea" }]} />
          </section>
          <section className="card p-5">
            <h2 className="mb-3 text-2xl">Messages</h2>
            <ApiForm endpoint="/api/v1/applications/message" extra={{ applicationId: app.id }} refresh resetOnSuccess submitLabel="Send to applicant" successMessage="Sent." fields={[{ name: "body", label: "Message", type: "textarea", required: true, rows: 3 }]} />
            <ul className="mt-4 space-y-2">{app.messages.map((m) => <li key={m.id} className="border-l-2 border-line pl-3 text-sm"><p className="text-xs uppercase tracking-widest text-fog">{m.fromStaff ? "ACL" : "Applicant"} · {timeAgo(m.createdAt)}</p><p className="whitespace-pre-line">{m.body}</p></li>)}</ul>
          </section>
        </div>
      </div>
    </div>
  );
}
