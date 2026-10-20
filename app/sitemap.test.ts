import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("uses stable LotFoundry canonical URLs without fabricated modification dates", () => {
    const entries = sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://lotfoundry.net/",
      "https://lotfoundry.net/studio",
      "https://lotfoundry.net/about",
      "https://lotfoundry.net/help",
      "https://lotfoundry.net/feedback",
      "https://lotfoundry.net/privacy",
      "https://lotfoundry.net/terms",
    ]);
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(true);
  });
});
