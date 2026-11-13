import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Africa Combat League", short_name: "ACL", description: "The digital home of African combat sports.", start_url: "/", display: "standalone", background_color: "#08080a", theme_color: "#08080a", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}
