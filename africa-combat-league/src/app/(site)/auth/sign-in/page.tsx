import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import en from "@/i18n/messages/en.json";
import { getTranslator } from "@/i18n";
import { isSupabaseConfigured, turnstileSiteKey } from "@/lib/env";
import { getSession, safeNext } from "@/lib/auth/session";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const [{ user }, t] = await Promise.all([getSession(), getTranslator()]);
  if (user) redirect(next);

  const labels = Object.fromEntries(Object.keys(en.auth).map((key) => [key, t(`auth.${key}`)]));

  return (
    <section className="container-page animate-page-in max-w-md py-10 md:py-16">
      <h1 className="display text-display-lg">{t("auth.title")}</h1>
      <p className="mt-2 mb-8 text-ash">{t("auth.lede")}</p>
      {isSupabaseConfigured ? (
        <SignInForm
          next={next}
          turnstileSiteKey={turnstileSiteKey}
          labels={labels}
          initialError={params.error ? "error_generic" : undefined}
        />
      ) : (
        <p role="status" className="card border-warn p-4 text-sm">
          {t("auth.not_configured")}
        </p>
      )}
      <p className="mt-8 text-xs text-ash">
        {t("auth.legal")}{" "}
        <Link href="/legal/terms" className="underline underline-offset-4">
          {t("nav.legal_terms")}
        </Link>{" "}
        ·{" "}
        <Link href="/legal/privacy" className="underline underline-offset-4">
          {t("nav.legal_privacy")}
        </Link>
      </p>
    </section>
  );
}
