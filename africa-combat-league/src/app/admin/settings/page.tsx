import type { Metadata } from "next";
import en from "@/i18n/messages/en.json";
import { getTranslator } from "@/i18n";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SettingForm } from "./setting-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin([], "/admin/settings");
  const [t, supabase] = await Promise.all([getTranslator(), createClient()]);
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value, description, is_public")
    .order("key");
  const labels = Object.fromEntries(Object.keys(en.admin.settings).map((key) => [key, t(`admin.settings.${key}`)]));

  return (
    <>
      <h1 className="display text-display-md">{t("admin.items.settings")}</h1>
      <p className="mt-1 max-w-2xl text-ash">{t("admin.settings.lede")}</p>
      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        {(settings ?? []).map((setting) => (
          <SettingForm key={setting.key} setting={setting} labels={labels} />
        ))}
      </div>
      <h2 className="display mt-10 mb-3 text-2xl">{t("admin.settings.add")}</h2>
      <div className="max-w-2xl">
        <SettingForm labels={labels} />
      </div>
    </>
  );
}
