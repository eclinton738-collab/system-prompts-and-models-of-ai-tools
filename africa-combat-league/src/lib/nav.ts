import { siteTree, type SiteNode } from "@/config/sitemap";
import type { Translate } from "@/i18n";

/** A sitemap node with its label resolved, safe to pass to client components. */
export type NavItem = { key: string; label: string; path: string; primary: boolean; children: NavItem[] };

export function buildNav(t: Translate, nodes: SiteNode[] = siteTree): NavItem[] {
  return nodes.map((node) => ({
    key: node.key,
    label: t(`nav.${node.key}`),
    path: node.path,
    primary: Boolean(node.primary),
    children: buildNav(t, node.children ?? []),
  }));
}
