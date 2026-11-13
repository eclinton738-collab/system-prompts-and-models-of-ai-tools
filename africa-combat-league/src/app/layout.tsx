import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { dataSaverBootScript } from "@/lib/data-saver";
import { siteUrl } from "@/lib/env";
import { getSettings, text } from "@/lib/settings";
import { defaultLocale } from "@/i18n/config";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import "./globals.css";

// Font faces. To change the brand fonts, swap these two and nothing else.
const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-acl-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-acl-body", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = text(settings, "brand.name");
  const description = `${text(settings, "brand.tagline")} ${text(settings, "brand.philosophy")}`;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `${name} | ${text(settings, "brand.tagline")}`, template: `%s | ${name}` },
    description,
    applicationName: name,
    appleWebApp: { capable: true, title: text(settings, "brand.short_name"), statusBarStyle: "black-translucent" },
    openGraph: { type: "website", siteName: name, locale: "en_NG", description },
    twitter: { card: "summary_large_image" },
    icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLocale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: dataSaverBootScript }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
