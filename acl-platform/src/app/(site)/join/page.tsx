import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { ApiForm } from "@/components/client/ApiForm";
import { safeNext } from "@/lib/safe-next";
import { flag } from "@/lib/format";

export const metadata: Metadata = { title: "Join ACL", description: "Create your free ACL account. Follow fighters, predict fights, earn fan points and build your ACL Passport.", alternates: { canonical: "/join" } };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const countries = await db.country.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="container-acl grid gap-10 py-10 sm:py-16 lg:grid-cols-2 lg:items-start">
      <div>
        <p className="eyebrow">ACL Passport</p>
        <h1 className="text-5xl sm:text-7xl">Join ACL</h1>
        <p className="mt-4 max-w-lg text-lg text-fog">Free forever. Your account is your passport to the league.</p>
        <ul className="mt-6 space-y-3">
          {["Follow fighters and get alerts the moment they are booked", "Predict fights and climb the fan leaderboard", "Earn points and badges — Rookie to Legend", "Digital tickets, orders and your watchlist in one place", "Start with 100 fan points and the Founding Fan badge this season"].map((b) => (
            <li key={b} className="flex gap-3"><span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rotate-45 bg-red" />{b}</li>
          ))}
        </ul>
      </div>
      <div className="card p-5 sm:p-6">
        <ApiForm
          endpoint="/api/v1/auth/register" redirectTo={next} submitLabel="Create account" successMessage="Welcome to ACL."
          fields={[
            { name: "name", label: "Full name", required: true, autoComplete: "name" },
            { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
            { name: "password", label: "Password", type: "password", required: true, autoComplete: "new-password", help: "At least 10 characters." },
            { name: "countryCode", label: "Country", type: "select", options: countries.map((c) => ({ value: c.code, label: `${flag(c.code)} ${c.name}` })), half: true },
            { name: "city", label: "City", half: true, autoComplete: "address-level2" },
            { name: "terms", label: "I agree to the Terms and Privacy Policy", type: "checkbox", required: true },
          ]}
        />
        <p className="mt-4 text-sm text-fog">Already a member? <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold text-gold underline">Sign in</Link> · <Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link></p>
      </div>
    </div>
  );
}
