import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/seo";

const routes = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/assets", changeFrequency: "hourly", priority: 0.9 },
  { path: "/compare", changeFrequency: "weekly", priority: 0.8 },
  { path: "/issuers", changeFrequency: "daily", priority: 0.7 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.7 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, siteConfig.url).toString(),
    changeFrequency,
    priority,
  }));
}
