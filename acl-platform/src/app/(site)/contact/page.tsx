import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { ApiForm } from "@/components/client/ApiForm";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Contact", description: "Contact Africa Combat League: tickets, press, partnerships, fighters and general enquiries.", alternates: { canonical: "/contact" } };
const TOPICS = ["General", "Tickets & orders", "Press", "Partnerships", "Fighters & scouting", "Gym listing", "Careers"];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const topic = TOPICS.find((t) => t.toLowerCase().startsWith(((await searchParams).topic ?? "").toLowerCase() || "~")) ?? "";
  const s = Object.fromEntries((await db.siteSetting.findMany({ where: { key: { in: ["contactEmail", "pressEmail", "partnershipsEmail"] } } })).map((x) => [x.key, x.value]));
  return (
    <>
      <PageHeader eyebrow="Get in touch" title="Contact ACL" />
      <div className="container-acl grid gap-10 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="card max-w-2xl p-5 sm:p-6">
          <ApiForm endpoint="/api/v1/contact" resetOnSuccess submitLabel="Send message" successMessage="Message sent. We will reply by email." initial={{ topic }}
            fields={[{ name: "name", label: "Name", required: true, half: true, autoComplete: "name" }, { name: "email", label: "Email", type: "email", required: true, half: true, autoComplete: "email" }, { name: "topic", label: "Topic", type: "select", required: true, options: TOPICS.map((t) => ({ value: t, label: t })) }, { name: "message", label: "Message", type: "textarea", required: true }]} />
        </div>
        <aside className="space-y-4 text-sm">
          {[["General", s.contactEmail], ["Press office", s.pressEmail], ["Partnerships", s.partnershipsEmail]].filter(([, v]) => v).map(([t, v]) => <div key={t} className="card p-4"><p className="label">{t}</p><a href={`mailto:${v}`} className="break-all font-semibold text-gold">{v}</a></div>)}
          <div className="card p-4"><p className="label">Looking for something else?</p><ul className="space-y-1.5"><li><Link className="hover:text-gold" href="/apply">Apply as a fighter →</Link></li><li><Link className="hover:text-gold" href="/partners">Sponsorship →</Link></li><li><Link className="hover:text-gold" href="/media">Media center →</Link></li></ul></div>
        </aside>
      </div>
    </>
  );
}
