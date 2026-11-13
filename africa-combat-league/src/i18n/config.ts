/**
 * i18n wiring. English ships at launch. To switch on another language:
 *   1. add src/i18n/messages/<locale>.json (copy en.json and translate),
 *   2. add the locale to `enabledLocales` below,
 *   3. add it to the `i18n.enabled_locales` setting in admin.
 */
export const locales = ["en", "fr", "pcm", "ha", "ig", "yo", "sw"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  pcm: "Naijá (Pidgin)",
  ha: "Hausa",
  ig: "Igbo",
  yo: "Yorùbá",
  sw: "Kiswahili",
};

export const defaultLocale: Locale = "en";
export const enabledLocales: Locale[] = ["en"];
