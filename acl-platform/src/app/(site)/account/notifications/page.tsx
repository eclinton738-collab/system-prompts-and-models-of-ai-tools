import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiForm } from "@/components/client/ApiForm";

export const metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const user = await requireUser("/account/notifications");
  const prefs = await db.notificationPreference.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  const f = (name: string, label: string) => ({ name, label, type: "checkbox" as const, half: true });
  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl sm:text-5xl">Alerts</h1>
      <p className="mb-6 mt-2 text-fog">Choose what ACL tells you about. Alerts appear in your notification centre.</p>
      <div className="card p-5">
        <ApiForm endpoint="/api/v1/notifications/preferences" method="PUT" initial={prefs} submitLabel="Save preferences" successMessage="Preferences saved."
          fields={[f("fightAnnouncements", "Fight announcements"), f("fighterFights", "Fights for fighters I follow"), f("eventReminders", "Event reminders"), f("results", "Results"), f("rankings", "Rankings updates"), f("breakingNews", "Breaking news"), f("ticketReleases", "Ticket releases"), f("merchDrops", "Merchandise drops"), f("newVideos", "New videos"), { name: "emailChannel", label: "Also send by email (when email delivery is enabled)", type: "checkbox" }]} />
      </div>
    </div>
  );
}
