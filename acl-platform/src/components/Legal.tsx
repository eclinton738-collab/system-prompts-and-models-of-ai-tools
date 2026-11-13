import { PageHeader } from "./ui";

export function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <>
      <PageHeader eyebrow="Legal" title={title} />
      <div className="container-acl max-w-3xl py-8 sm:py-12">
        <p className="mb-8 border border-gold/40 bg-gold/10 p-4 text-sm text-gold-soft">Prototype notice: this page describes how the platform is built to behave. It is a working draft and must be reviewed by qualified legal counsel in each operating country before launch.</p>
        <div className="space-y-8">{sections.map(([h, b]) => <section key={h}><h2 className="mb-2 text-2xl">{h}</h2><p className="leading-relaxed text-bone/85">{b}</p></section>)}</div>
      </div>
    </>
  );
}
