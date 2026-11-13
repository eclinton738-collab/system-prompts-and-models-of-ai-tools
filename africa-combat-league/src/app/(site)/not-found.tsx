import Link from "next/link";
import { getTranslator } from "@/i18n";

export default async function NotFound() {
  const t = await getTranslator();
  return (
    <section className="container-page py-16">
      <p className="label text-ember-bright">404</p>
      <h1 className="display mt-3 text-display-lg">{t("common.not_found_title")}</h1>
      <p className="mt-4 text-lg text-ash">{t("common.not_found_body")}</p>
      <Link href="/" className="btn btn-primary mt-8">
        {t("common.back_home")}
      </Link>
    </section>
  );
}
