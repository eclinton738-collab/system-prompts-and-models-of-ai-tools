import Link from "next/link";
import { siteTree } from "@/config/sitemap";
import { getTranslator } from "@/i18n";
import { getSettings, record, text } from "@/lib/settings";

// Home shell. The full home page (event hero, countdown, fight card) comes next.
export default async function HomePage() {
  const [settings, t] = await Promise.all([getSettings(), getTranslator()]);
  const first = record(settings, "facts.acl_001");
  const attendance = Number(first.attendance_approx);

  return (
    <div className="animate-page-in">
      <section className="relative overflow-hidden border-b border-line">
        {/* Ring ropes: decorative, hidden in Data saver. */}
        <div aria-hidden="true" className="saver-hide pointer-events-none absolute inset-x-0 top-0 h-full opacity-[0.07]">
          <div className="absolute inset-x-0 top-[28%] h-1 bg-bone" />
          <div className="absolute inset-x-0 top-[50%] h-1 bg-bone" />
          <div className="absolute inset-x-0 top-[72%] h-1 bg-bone" />
        </div>
        <div className="container-page relative py-14 md:py-24">
          <p className="label text-ember-bright">
            {t("home.hq", {
              city: text(settings, "hq.city"),
              state: text(settings, "hq.state"),
              country: text(settings, "hq.country"),
            })}
          </p>
          <h1 className="display mt-3 text-display-xl">
            {text(settings, "brand.tagline")
              .split(/(?<=\.)\s+/)
              .map((line, index) => (
                <span key={line} className={`block ${index === 1 ? "text-ember" : ""}`}>
                  {line}
                </span>
              ))}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ash md:text-xl">
            {text(settings, "brand.name")}. {text(settings, "brand.philosophy")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/events" className="btn btn-primary">
              {t("nav.events")}
            </Link>
            <Link href="/road-to-acl" className="btn btn-ghost">
              {t("nav.road_to_acl")}
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 md:grid-cols-2 md:py-16">
        <div>
          <p className="label text-ash">{t("home.story_label")}</p>
          <h2 className="display mt-2 text-display-md">{text(settings, "brand.story_title")}</h2>
          <p className="mt-4 text-lg text-ash">{text(settings, "brand.story_body")}</p>
          <Link href="/about/manifesto" className="btn btn-ghost mt-6">
            {t("nav.about_manifesto")}
          </Link>
        </div>
        <div className="card p-6">
          <p className="label text-gold">{t("home.first_event_label")}</p>
          <h2 className="display mt-2 text-display-md">{String(first.name ?? "")}</h2>
          <p className="display text-display-sm text-ash">{String(first.title ?? "")}</p>
          <p className="mt-1 text-sm text-ash">
            {String(first.town ?? "")}, {String(first.state ?? "")}
          </p>
          <div className="bamboo-rule my-5" aria-hidden="true" />
          <p className="display text-display-sm">
            {Number.isFinite(attendance) && t("home.attendance", { count: attendance.toLocaleString("en-NG") })}
          </p>
          <p className="display text-display-sm text-ember-bright">
            {t("home.no_ads", {
              amount: String(first.paid_advertising ?? "").replace(/^./, (letter) => letter.toUpperCase()),
            })}
          </p>
          <p className="mt-4 text-sm text-ash">{text(settings, "brand.origin_symbol")}</p>
        </div>
      </section>

      <section className="container-page pb-4">
        <h2 className="label text-ash">{t("home.explore")}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {siteTree
            .filter((node) => node.key !== "legal")
            .map((node) => (
              <li key={node.key}>
                <Link
                  href={node.path}
                  className="card display block px-4 py-5 text-2xl transition-colors duration-(--duration-fast) hover:border-ember"
                >
                  {t(`nav.${node.key}`)}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
