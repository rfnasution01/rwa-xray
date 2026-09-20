import { describe, expect, it } from "vitest";

import { createPageMetadata, siteConfig } from "./seo";

describe("SEO metadata", () => {
  it("uses a valid public site origin", () => {
    const url = new URL(siteConfig.url);
    expect(["http:", "https:"]).toContain(url.protocol);
    expect(url.pathname).toBe("/");
  });

  it("builds canonical and social metadata consistently", () => {
    const metadata = createPageMetadata({
      title: "RWA Explorer",
      description: "Explore tokenized real-world assets.",
      path: "assets",
    });

    expect(metadata.title).toBe("RWA Explorer");
    expect(metadata.alternates).toEqual({ canonical: "/assets" });
    expect(metadata.openGraph).toMatchObject({
      title: "RWA Explorer",
      url: "/assets",
      siteName: "RWA X-Ray",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "RWA Explorer",
    });
  });

  it("marks invalid dynamic routes as non-indexable", () => {
    const metadata = createPageMetadata({
      title: "Asset X-Ray",
      description: "Unavailable asset identifier.",
      path: "/assets",
      index: false,
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
