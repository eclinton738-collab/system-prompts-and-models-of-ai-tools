import type { MetadataRoute } from "next";
import { getTranslator } from "@/i18n";
import { getSettings, text } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [settings, t] = await Promise.all([getSettings(), getTranslator()]);
  return {
    id: "/",
    name: text(settings, "brand.name"),
    short_name: text(settings, "brand.short_name"),
    description: `${text(settings, "brand.tagline")} ${text(settings, "brand.philosophy")}`,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "en",
    categories: ["sports", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: t("nav.events"), url: "/events" },
      { name: t("nav.tickets"), url: "/tickets" },
      { name: t("nav.watch"), url: "/watch" },
    ],
  };
}
