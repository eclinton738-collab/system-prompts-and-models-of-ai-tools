import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders-display";
import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.short}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { type: "website", siteName: SITE.name, locale: "en", title: SITE.name, description: SITE.description, images: ["/api/og/site"] },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description, images: ["/api/og/site"] },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#08080a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:bg-gold focus:px-3 focus:py-2 focus:text-black">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
