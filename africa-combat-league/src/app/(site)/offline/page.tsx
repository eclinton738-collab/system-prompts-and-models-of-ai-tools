import type { Metadata } from "next";
import { getTranslator } from "@/i18n";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

// Precached by the service worker and shown when there is no network.
export default async function OfflinePage() {
  const t = await getTranslator();
  return (
    <section className="container-page py-16">
      <h1 className="display text-display-lg">{t("offline.title")}</h1>
      <div className="bamboo-rule mt-6 max-w-xs" aria-hidden="true" />
      <p className="mt-6 max-w-md text-lg text-ash">{t("offline.body")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {/* Plain links on purpose: a full reload lets the service worker answer from cache. */}
        {/* eslint-disable @next/next/no-html-link-for-pages */}
        <a href="/tickets" className="btn btn-primary">
          {t("offline.tickets")}
        </a>
        <a href="/" className="btn btn-ghost">
          {t("offline.retry")}
        </a>
        {/* eslint-enable @next/next/no-html-link-for-pages */}
      </div>
    </section>
  );
}
