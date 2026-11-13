import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { ApiForm } from "@/components/client/ApiForm";
import { flag } from "@/lib/format";

export const metadata: Metadata = { title: "Become an ACL Fighter", description: "Apply to fight in Africa Combat League. Submit your record, videos and details to the ACL scouting team.", alternates: { canonical: "/apply" } };
const STAGES = [["Application", "Tell us who you are and send your fight footage."], ["Review", "Scouts check your record, documents and video."], ["Scouting", "We watch you live or in sparring."], ["Test", "Medicals and an ACL assessment session."], ["Contract", "Terms are offered and signed."], ["ACL Fighter", "You are on the roster and in the rankings."]];

export default async function ApplyPage() {
  const user = await getCurrentUser();
  const [countries, existing] = await Promise.all([db.country.findMany({ orderBy: { name: "asc" } }), user ? db.application.findFirst({ where: { userId: user.id, status: { not: "DECLINED" } } }) : null]);
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-coal">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(227,24,45,0.3),transparent_60%)]" />
        <div className="container-acl relative py-10 sm:py-16">
          <p className="eyebrow">ACL Scouting</p>
          <h1 className="mt-1 max-w-4xl text-5xl sm:text-8xl">Become an ACL fighter</h1>
          <p className="mt-4 max-w-2xl text-lg text-fog">We are looking for the best boxers on the continent — men and women, every weight class, every country. If you can fight, we want to see it.</p>
        </div>
      </header>
      <div className="container-acl py-8 sm:py-12">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {STAGES.map(([t, d], i) => <li key={t} className="card p-3"><span className="display text-3xl text-red">{String(i + 1).padStart(2, "0")}</span><p className="display text-xl leading-none">{t}</p><p className="mt-1 text-xs text-fog">{d}</p></li>)}
        </ol>
        <div className="mt-10 max-w-3xl">
          <h2 className="mb-4 text-3xl sm:text-4xl">Your application</h2>
          {!user ? (
            <div className="card p-6"><p className="text-fog">Create a free ACL account first. It lets you track your application, upload documents and receive messages from the scouting team.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/join?next=/apply" className="btn btn-red">Create account</Link><Link href="/sign-in?next=/apply" className="btn btn-ghost">Sign in</Link></div></div>
          ) : existing ? (
            <div className="card p-6"><p className="display text-2xl">You have an application in progress</p><p className="mt-1 text-fog">Track its status and messages in the fighter portal.</p><Link href="/portal" className="btn btn-red mt-4">Open fighter portal</Link></div>
          ) : (
            <div className="card p-5 sm:p-6">
              <ApiForm endpoint="/api/v1/applications" redirectTo="/portal" submitLabel="Submit application" successMessage="Application received."
                initial={{ fullName: user.name, email: user.email, countryCode: user.countryCode ?? "", city: user.city ?? "" }}
                fields={[
                  { name: "fullName", label: "Full name", required: true, half: true }, { name: "dateOfBirth", label: "Date of birth", type: "date", required: true, half: true, help: "You must be 18 or older." },
                  { name: "countryCode", label: "Country", type: "select", required: true, half: true, options: countries.map((c) => ({ value: c.code, label: `${flag(c.code)} ${c.name}` })) }, { name: "city", label: "City", required: true, half: true },
                  { name: "weightKg", label: "Weight (kg)", type: "number", required: true, half: true, min: 40, max: 200, step: "any" }, { name: "heightCm", label: "Height (cm)", type: "number", required: true, half: true, min: 130, max: 230 },
                  { name: "reachCm", label: "Reach (cm)", type: "number", half: true, min: 130, max: 240 }, { name: "stance", label: "Stance", type: "select", required: true, half: true, options: [{ value: "ORTHODOX", label: "Orthodox" }, { value: "SOUTHPAW", label: "Southpaw" }, { value: "SWITCH", label: "Switch" }] },
                  { name: "wins", label: "Wins", type: "number", required: true, half: true, min: 0 }, { name: "losses", label: "Losses", type: "number", required: true, half: true, min: 0 }, { name: "draws", label: "Draws", type: "number", required: true, half: true, min: 0 },
                  { name: "gymName", label: "Gym", half: true }, { name: "coachName", label: "Coach", half: true },
                  { name: "experience", label: "Experience", type: "textarea", required: true, help: "Amateur and professional background, titles, notable opponents." },
                  { name: "videoLinks", label: "Fight video links", type: "list", required: true, help: "One link per line (YouTube, Instagram, Google Drive…)." }, { name: "photoLinks", label: "Photo links", type: "list", help: "Optional. One per line." },
                  { name: "phone", label: "Phone / WhatsApp", type: "tel", required: true, half: true }, { name: "email", label: "Contact email", type: "email", required: true, half: true },
                ]} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
