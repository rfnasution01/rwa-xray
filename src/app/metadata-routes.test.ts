import { describe, expect, it } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";

describe("metadata routes", () => {
  it("allows public pages while excluding internal APIs", () => {
    const result = robots();

    expect(result.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    });
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("lists each stable public route once", () => {
    const entries = sitemap();
    const paths = entries.map(({ url }) => new URL(url).pathname);

    expect(paths).toEqual([
      "/",
      "/assets",
      "/compare",
      "/issuers",
      "/methodology",
    ]);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
