import en from "./messages/en.json";
import { defaultLocale, enabledLocales, type Locale } from "./config";

export type Messages = typeof en;
type Vars = Record<string, string | number>;

const loaders: Partial<Record<Locale, () => Promise<Messages>>> = {
  en: async () => en,
  // fr: () => import("./messages/fr.json").then((m) => m.default),
};

export async function getMessages(locale: Locale = defaultLocale): Promise<Messages> {
  const active = enabledLocales.includes(locale) ? locale : defaultLocale;
  return (await loaders[active]?.()) ?? en;
}

function lookup(messages: unknown, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>(
    (node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined),
    messages,
  );
  return typeof value === "string" ? value : undefined;
}

export type Translate = (key: string, vars?: Vars) => string;

/** Missing keys fall back to English, then to the key itself. */
export function createTranslator(messages: Messages): Translate {
  return (key, vars) => {
    const template = lookup(messages, key) ?? lookup(en, key) ?? key;
    return vars ? template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`)) : template;
  };
}

export async function getTranslator(locale: Locale = defaultLocale): Promise<Translate> {
  return createTranslator(await getMessages(locale));
}
