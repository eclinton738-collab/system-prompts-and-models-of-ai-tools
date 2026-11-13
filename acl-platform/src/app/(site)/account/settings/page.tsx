import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiForm } from "@/components/client/ApiForm";
import { flag } from "@/lib/format";

export const metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const user = await requireUser("/account/settings");
  const [countries, sessions] = await Promise.all([db.country.findMany({ orderBy: { name: "asc" } }), db.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } })]);
  return (
    <div className="grid max-w-4xl gap-8 lg:grid-cols-2">
      <section className="card p-5" aria-labelledby="prof">
        <h1 id="prof" className="mb-4 text-3xl">Profile</h1>
        <ApiForm endpoint="/api/v1/me" method="PATCH" refresh initial={{ name: user.name, countryCode: user.countryCode ?? "", city: user.city ?? "" }} submitLabel="Save profile" successMessage="Profile updated."
          fields={[{ name: "name", label: "Full name", required: true }, { name: "countryCode", label: "Country", type: "select", options: countries.map((c) => ({ value: c.code, label: `${flag(c.code)} ${c.name}` })) }, { name: "city", label: "City" }]} />
        <p className="mt-4 text-xs text-fog">Email: {user.email} · Role: {user.role}</p>
      </section>
      <section className="card p-5" aria-labelledby="pw">
        <h2 id="pw" className="mb-4 text-3xl">Password</h2>
        <ApiForm endpoint="/api/v1/me/password" resetOnSuccess submitLabel="Change password" successMessage="Password changed. Other devices were signed out."
          fields={[{ name: "current", label: "Current password", type: "password", required: true, autoComplete: "current-password" }, { name: "next", label: "New password", type: "password", required: true, autoComplete: "new-password", help: "At least 10 characters." }]} />
        <p className="mt-4 text-xs text-fog">{sessions} active {sessions === 1 ? "session" : "sessions"} on your account.</p>
      </section>
    </div>
  );
}
