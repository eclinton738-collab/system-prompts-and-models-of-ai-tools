import type { MetadataRoute } from "next";
import { flattenTree } from "@/config/sitemap";
import { siteUrl } from "@/lib/env";

// Static routes today. Event, fighter, article and product URLs get appended
// here from the database as those features are built.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    ...flattenTree().map((node) => ({
      url: `${siteUrl}${node.path}`,
      changeFrequency: "weekly" as const,
      priority: node.trail.length === 0 ? 0.8 : 0.6,
    })),
  ];
}
