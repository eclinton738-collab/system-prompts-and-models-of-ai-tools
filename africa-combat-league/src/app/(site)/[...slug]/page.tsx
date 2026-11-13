import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findNodeByPath, flattenTree } from "@/config/sitemap";
import { getTranslator } from "@/i18n";
import { ComingSoon } from "@/components/ui/coming-soon";

/**
 * Every sitemap route that has no page of its own yet lands here and shows
 * "Coming soon". When you build a real page (e.g. src/app/(site)/events/page.tsx)
 * Next.js picks it over this catch-all automatically.
 */
type Props = { params: Promise<{ slug: string[] }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return flattenTree().map((node) => ({ slug: node.path.split("/").filter(Boolean) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const node = findNodeByPath(`/${slug.join("/")}`);
  if (!node) return {};
  const t = await getTranslator();
  const trail = [...node.trail, node].map((entry) => t(`nav.${entry.key}`));
  return {
    title: trail.reverse().join(" · "),
    alternates: { canonical: node.path },
    // Placeholder pages stay out of search until they are real.
    robots: { index: false, follow: true },
  };
}

export default async function ComingSoonPage({ params }: Props) {
  const { slug } = await params;
  const node = findNodeByPath(`/${slug.join("/")}`);
  if (!node) notFound();
  const t = await getTranslator();

  return (
    <ComingSoon
      title={t(`nav.${node.key}`)}
      badge={t("common.coming_soon")}
      body={t("common.coming_soon_body")}
      crumbLabel={t("common.breadcrumb")}
      crumbs={[
        { label: t("nav.home"), path: "/" },
        ...node.trail.map((entry) => ({ label: t(`nav.${entry.key}`), path: entry.path })),
      ]}
      linksLabel={t("common.in_this_section")}
      links={(node.children ?? []).map((child) => ({ label: t(`nav.${child.key}`), path: child.path }))}
      back={{ label: t("common.back_home"), path: "/" }}
    />
  );
}
