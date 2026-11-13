import type { Metadata } from "next";
import Link from "next/link";
import { getTranslator } from "@/i18n";
import { isStaff } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "../auth/actions";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export const dynamic = "force-dynamic";

// Account shell. Tickets, orders, membership and profile editing land here later.
export default async function AccountPage() {
  const [{ user, roles, twoFactor }, t] = await Promise.all([requireUser("/account"), getTranslator()]);
  const staff = isStaff(roles);

  return (
    <section className="container-page animate-page-in max-w-2xl py-10 md:py-16">
      <h1 className="display text-display-lg">{t("account.title")}</h1>
      <p className="mt-2 break-all text-ash">{user.email ?? user.phone}</p>

      <div className="card mt-8 divide-y divide-line">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <h2 className="label text-ash">{t("account.roles")}</h2>
          <ul className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <li key={role} className={`label border px-2 py-1 ${role === "super_admin" ? "border-gold text-gold" : "border-line"}`}>
                {role.replace("_", " ")}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h2 className="label text-ash">{t("account.two_factor")}</h2>
            <p className="mt-1 text-sm font-semibold">{twoFactor ? t("account.two_factor_on") : t("account.two_factor_off")}</p>
          </div>
          {!twoFactor && (
            <Link href="/auth/mfa?next=/account" className="btn btn-ghost">
              {t("account.set_up")}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {staff && (
          <Link href="/admin" className="btn btn-primary">
            {t("account.open_admin")}
          </Link>
        )}
        <form action={signOut}>
          <button type="submit" className="btn btn-ghost">
            {t("auth.sign_out")}
          </button>
        </form>
      </div>
    </section>
  );
}
