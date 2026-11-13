import "server-only";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";
import fallback from "@/config/settings-fallback.json";

/**
 * Site settings come from the `settings` table and are editable in
 * /admin/settings. Public pages read them through a cached, cookie-less
 * request so pages stay static and fast.
 *
 * `settings-fallback.json` is used ONLY when the database is unreachable or
 * not configured (first run, local dev, outage) so the site never renders
 * blank. The database always wins.
 */
export type SettingsMap = Record<string, unknown>;
export const SETTINGS_TAG = "settings";

export async function getSettings(): Promise<SettingsMap> {
  if (!isSupabaseConfigured) return fallback;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/settings?select=key,value&is_public=is.true`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
      next: { revalidate: 300, tags: [SETTINGS_TAG] },
    });
    if (!response.ok) throw new Error(`settings ${response.status}`);
    const rows = (await response.json()) as { key: string; value: unknown }[];
    return { ...fallback, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
  } catch (error) {
    console.error("[settings] falling back to bundled defaults:", error);
    return fallback;
  }
}

export function text(settings: SettingsMap, key: string): string {
  const value = settings[key];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function record(settings: SettingsMap, key: string): Record<string, unknown> {
  const value = settings[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
