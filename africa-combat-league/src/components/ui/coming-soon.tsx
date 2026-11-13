import Link from "next/link";

type Crumb = { label: string; path: string };
type Props = {
  title: string;
  badge: string;
  body: string;
  crumbs?: Crumb[];
  crumbLabel?: string;
  links?: Crumb[];
  linksLabel?: string;
  back?: Crumb;
};

/** Shown for every page in the sitemap that has not been built yet. */
export function ComingSoon({ title, badge, body, crumbs = [], crumbLabel, links = [], linksLabel, back }: Props) {
  return (
    <section className="container-page animate-page-in py-10 md:py-16">
      {crumbs.length > 0 && (
        <nav aria-label={crumbLabel} className="mb-6">
          <ol className="label flex flex-wrap gap-2 text-ash">
            {crumbs.map((crumb) => (
              <li key={crumb.path} className="flex gap-2">
                <Link href={crumb.path} className="hover:text-bone">
                  {crumb.label}
                </Link>
                <span aria-hidden="true">/</span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <p className="label inline-block border border-ember px-2.5 py-1 text-ember-bright">{badge}</p>
      <h1 className="display mt-4 text-display-lg">{title}</h1>
      <div className="bamboo-rule mt-6 max-w-xs" aria-hidden="true" />
      <p className="mt-6 max-w-xl text-lg text-ash">{body}</p>

      {links.length > 0 && (
        <div className="mt-10">
          <h2 className="label text-ash">{linksLabel}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => (
              <li key={link.path}>
                <Link
                  href={link.path}
                  className="card display block px-4 py-5 text-2xl transition-colors duration-(--duration-fast) hover:border-ember"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {back && (
        <Link href={back.path} className="btn btn-ghost mt-10">
          {back.label}
        </Link>
      )}
    </section>
  );
}
