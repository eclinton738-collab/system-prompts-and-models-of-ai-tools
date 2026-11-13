"use client";

import en from "@/i18n/messages/en.json";

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="container-page py-16">
      <h1 className="display text-display-lg">{en.common.error_title}</h1>
      <p className="mt-4 text-lg text-ash">{en.common.error_body}</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        {en.common.try_again}
      </button>
    </section>
  );
}
