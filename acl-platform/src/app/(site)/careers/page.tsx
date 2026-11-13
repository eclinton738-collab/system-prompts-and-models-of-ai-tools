import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Careers", description: "Work at Africa Combat League.", alternates: { canonical: "/careers" } };

export default function CareersPage() {
  return (
    <>
      <PageHeader eyebrow="Work with us" title="Careers" intro="ACL is building teams in events, media production, scouting, partnerships and technology across Africa." />
      <div className="container-acl max-w-3xl py-8 sm:py-12">
        <div className="card p-6">
          <p className="display text-2xl">No open roles are listed right now</p>
          <p className="mt-2 text-fog">Vacancies are published on this page when they open. If you believe you can help build African combat sports, introduce yourself — we keep every message.</p>
          <Link href="/contact?topic=Careers" className="btn btn-red mt-5">Introduce yourself</Link>
        </div>
        <p className="mt-6 text-sm text-fog">Fighters: <Link href="/apply" className="text-gold underline">apply through the scouting portal</Link>.</p>
      </div>
    </>
  );
}
