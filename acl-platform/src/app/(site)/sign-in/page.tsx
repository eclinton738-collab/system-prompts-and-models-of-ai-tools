import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { ApiForm } from "@/components/client/ApiForm";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const demo = (await db.siteSetting.findUnique({ where: { key: "demoMode" } }))?.value === "true";
  return (
    <div className="container-acl flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <p className="eyebrow">Welcome back</p>
        <h1 className="mb-6 text-5xl">Sign in</h1>
        <div className="card p-5">
          <ApiForm endpoint="/api/v1/auth/login" redirectTo={next} submitLabel="Sign in" successMessage="Signed in." fields={[{ name: "email", label: "Email", type: "email", required: true, autoComplete: "email" }, { name: "password", label: "Password", type: "password", required: true, autoComplete: "current-password" }]} />
        </div>
        <p className="mt-4 text-sm text-fog">New to ACL? <Link href={`/join?next=${encodeURIComponent(next)}`} className="font-semibold text-gold underline">Create your free account</Link></p>
        {demo && (
          <div className="mt-6 border border-gold/40 bg-gold/10 p-4 text-xs text-gold-soft">
            <p className="font-bold uppercase tracking-widest">Demo accounts</p>
            <p className="mt-1">Password for all: <code className="font-mono">AclDemo!2026</code></p>
            <p className="mt-1">fan@acl.demo · fighter@acl.demo · admin@acl.demo · editor@acl.demo · events@acl.demo · scout@acl.demo · press@acl.demo</p>
          </div>
        )}
      </div>
    </div>
  );
}
