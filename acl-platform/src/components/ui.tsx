import Link from "next/link";
import type { ReactNode } from "react";
import { flag } from "@/lib/format";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Flag({ code, name, className }: { code?: string | null; name?: string; className?: string }) {
  if (!code) return null;
  return (
    <span role="img" aria-label={name ?? code} title={name ?? code} className={className}>
      {flag(code)}
    </span>
  );
}

export function SectionHeader({ eyebrow, title, href, linkLabel = "View all", children }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl">{title}</h2>
        {children}
      </div>
      {href && (
        <Link href={href} className="shrink-0 pb-1 text-sm font-semibold uppercase tracking-widest text-fog hover:text-gold">
          {linkLabel} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: ReactNode }) {
  return (
    <header className="slash-bg border-b border-line bg-coal">
      <div className="container-acl py-8 sm:py-12">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-fog sm:text-lg">{intro}</p>}
        {children}
      </div>
    </header>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { href: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div aria-hidden className="mb-4 h-10 w-10 rotate-45 border-2 border-line" />
      <p className="display text-2xl">{title}</p>
      {body && <p className="mt-2 max-w-md text-sm text-fog">{body}</p>}
      {action && (
        <Link href={action.href} className="btn btn-ghost btn-sm mt-5">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-fog">{label}</p>
      <p className={cx("display mt-1 text-3xl sm:text-4xl", accent && "text-gold")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-fog">{sub}</p>}
    </div>
  );
}

/** Link-driven tabs: work without JavaScript and are shareable/indexable. */
export function Tabs({ tabs, active, base, param = "tab" }: { tabs: { key: string; label: string; count?: number }[]; active: string; base: string; param?: string }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <nav aria-label="Sections" className="-mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
      <ul className="flex min-w-max gap-1">
        {tabs.map((t, i) => (
          <li key={t.key}>
            <Link
              href={i === 0 ? base : `${base}${sep}${param}=${t.key}`}
              scroll={false}
              aria-current={active === t.key ? "page" : undefined}
              className={cx(
                "display block border-b-2 px-3 py-3 text-lg tracking-wider transition-colors sm:px-4",
                active === t.key ? "border-red text-bone" : "border-transparent text-fog hover:text-bone",
              )}
            >
              {t.label}
              {t.count != null && <span className="ml-1.5 text-sm text-fog">{t.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LiveBadge({ label = "Live" }: { label?: string }) {
  return (
    <span className="chip chip-red">
      <span aria-hidden className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-white" />
      {label}
    </span>
  );
}

export function Movement({ rank, previous }: { rank: number; previous: number | null }) {
  if (previous == null) return <span className="chip chip-gold" title="New entry">New</span>;
  const diff = previous - rank;
  if (diff === 0) return <span className="text-fog" title="No change" aria-label="No change">—</span>;
  return diff > 0 ? (
    <span className="font-semibold text-win" aria-label={`Up ${diff}`}>▲ {diff}</span>
  ) : (
    <span className="font-semibold text-red" aria-label={`Down ${-diff}`}>▼ {-diff}</span>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-xs uppercase tracking-widest text-fog">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {it.href ? <Link href={it.href} className="hover:text-gold">{it.label}</Link> : <span aria-current="page" className="text-bone">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** JSON-LD structured data. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Simple horizontal bar list for dashboards and vote splits. */
export function BarList({ rows, format = (n: number) => String(n) }: { rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-fog">No data in this period.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-fog" title={r.label}>{r.label}</span>
          <span className="h-2 bg-steel"><span className="block h-2 bg-gold" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="tabular-nums">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
