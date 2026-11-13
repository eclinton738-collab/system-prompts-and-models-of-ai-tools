import type { Metadata } from "next";
import en from "@/i18n/messages/en.json";
import { getTranslator } from "@/i18n";
import { requireUser, safeNext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Two-factor", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function MfaPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next, "/admin");
  await requireUser(`/auth/mfa?next=${encodeURIComponent(next)}`);
  const [t, supabase] = await Promise.all([getTranslator(), createClient()]);
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp?.[0];
  const labels = Object.fromEntries(Object.keys(en.auth).map((key) => [key, t(`auth.${key}`)]));

  return (
    <section className="container-page animate-page-in max-w-md py-10 md:py-16">
      <h1 className="display text-display-lg">{t("auth.mfa_title")}</h1>
      <p className="mt-2 mb-8 text-ash">{t("auth.mfa_lede")}</p>
      <MfaForm next={next} verifiedFactorId={verified?.id} labels={labels} />
    </section>
  );
}
