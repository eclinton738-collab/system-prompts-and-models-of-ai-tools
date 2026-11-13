import type { MetadataRoute } from "next";
import { abs } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/portal", "/cart", "/notifications", "/api/v1/", "/sign-in", "/search"] }], sitemap: abs("/sitemap.xml"), host: abs("") };
}
