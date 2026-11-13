import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { EmptyState, PageHeader } from "@/components/ui";
import { fmtDate, label } from "@/lib/format";

export const metadata: Metadata = { title: "Media Center", description: "ACL press office: press releases, fighter bios, fight cards, official statistics, logos and media kits for journalists.", alternates: { canonical: "/media" } };

export default async function MediaPage() {
  const user = await getCurrentUser();
  const [assets, settings, events] = await Promise.all([
    db.mediaAsset.findMany({ orderBy: { publishedAt: "desc" }, include: { event: { select: { name: true, slug: true } } } }),
    db.siteSetting.findUnique({ where: { key: "pressEmail" } }),
    db.event.findMany({ where: { type: "FIGHT_NIGHT" }, orderBy: { startsAt: "desc" }, take: 6, select: { slug: true, name: true, photos: { select: { id: true } } } }),
  ]);
  const accredited = can(user?.role, "media.download");
  const releases = assets.filter((a) => a.kind === "PRESS_RELEASE");
  const downloads = assets.filter((a) => a.kind !== "PRESS_RELEASE");
  return (
    <>
      <PageHeader eyebrow="Press office" title="Media center" intro="Resources for journalists, broadcasters and media partners covering Africa Combat League." />
      <div className="container-acl grid gap-10 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-12">
          <section aria-labelledby="pr">
            <h2 id="pr" className="mb-5 text-3xl sm:text-4xl">Press releases</h2>
            {releases.length ? (
              <ul className="space-y-3">
                {releases.map((r) => (
                  <li key={r.id}>
                    <details className="card group">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4"><span><span className="text-xs uppercase tracking-widest text-fog">{fmtDate(r.publishedAt)}</span><span className="display block text-2xl leading-none">{r.title}</span><span className="mt-1 block text-sm text-fog">{r.description}</span></span><span aria-hidden className="text-2xl text-gold transition-transform group-open:rotate-45">+</span></summary>
                      <div className="prose-acl border-t border-line p-4">{(r.body ?? "").split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}{r.event && <Link href={`/events/${r.event.slug}`} className="text-sm font-semibold uppercase tracking-widest text-gold">{r.event.name} →</Link>}</div>
                    </details>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No press releases yet" />}
          </section>
          <section aria-labelledby="dl">
            <h2 id="dl" className="mb-2 text-3xl sm:text-4xl">Downloads</h2>
            <p className="mb-5 text-sm text-fog">Fighter bios, fight cards and statistics are generated live from the league database, so they are always current.</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {downloads.map((d) => (
                <li key={d.id} className="card flex flex-col p-4">
                  <span className="chip mb-2 self-start">{label(d.kind)}</span>
                  <p className="display text-2xl leading-none">{d.title}</p>
                  <p className="mt-1 flex-1 text-sm text-fog">{d.description}</p>
                  {d.fileUrl && accredited ? <a href={d.fileUrl} download className="btn btn-white btn-sm mt-3 self-start">Download</a> : d.fileUrl ? <span className="mt-3 text-xs font-semibold uppercase tracking-widest text-fog">Accredited media only</span> : <span className="mt-3 text-xs text-fog">File not uploaded yet</span>}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="ph">
            <h2 id="ph" className="mb-5 text-3xl sm:text-4xl">Event & fighter photography</h2>
            <ul className="divide-y divide-line border-y border-line">
              {events.map((e) => <li key={e.slug} className="flex items-center justify-between gap-3 py-3"><Link href={`/events/${e.slug}`} className="font-semibold hover:text-gold">{e.name}</Link><span className="text-sm text-fog">{e.photos.length ? `${e.photos.length} photos` : "Gallery not yet published"}</span></li>)}
            </ul>
            <p className="mt-3 text-sm text-fog">High-resolution editorial photography is supplied to accredited media on request.</p>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="card p-5" aria-labelledby="acc">
            <h2 id="acc" className="mb-2 text-2xl">Media access</h2>
            {accredited ? <p className="text-sm text-win">You are signed in with media access. Downloads are unlocked.</p> : user ? <p className="text-sm text-fog">Your account does not have media accreditation. Contact the press office to request it.</p> : <><p className="text-sm text-fog">Sign in with an accredited journalist or media-partner account to download assets.</p><Link href="/sign-in?next=/media" className="btn btn-red btn-sm mt-3">Sign in</Link></>}
          </section>
          <section className="card p-5" aria-labelledby="pc">
            <h2 id="pc" className="mb-2 text-2xl">Press contact</h2>
            <p className="text-sm text-fog">Accreditation, interview requests and editorial enquiries:</p>
            {settings?.value && <a href={`mailto:${settings.value}`} className="mt-2 block break-all font-semibold text-gold">{settings.value}</a>}
            <Link href="/contact?topic=Press" className="btn btn-ghost btn-sm mt-3">Contact form</Link>
          </section>
          <section className="card p-5"><h2 className="mb-2 text-2xl">Quick links</h2><ul className="space-y-2 text-sm"><li><Link className="hover:text-gold" href="/fighters">Fighter database →</Link></li><li><Link className="hover:text-gold" href="/rankings">Official rankings →</Link></li><li><Link className="hover:text-gold" href="/fights?tab=completed">Official results →</Link></li><li><Link className="hover:text-gold" href="/events">Event calendar →</Link></li></ul></section>
        </aside>
      </div>
    </>
  );
}
