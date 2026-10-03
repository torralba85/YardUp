import { describe, expect, it } from "vitest";
import { SOCIAL_LINKS, SOCIAL_URLS } from "./social-links";

describe("social-links", () => {
  it("defines valid HTTPS profile URLs", () => {
    expect(SOCIAL_URLS.length).toBe(4);
    for (const url of SOCIAL_URLS) {
      expect(url).toMatch(/^https:\/\//);
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it("points to active LotFoundry brand handles", () => {
    expect(SOCIAL_LINKS.facebook).toBe("https://www.facebook.com/lotfoundry");
    expect(SOCIAL_LINKS.instagram).toBe("https://www.instagram.com/lot_foundry");
    expect(SOCIAL_LINKS.youtube).toBe("https://www.youtube.com/@lotfoundry");
    expect(SOCIAL_LINKS.x).toBe("https://x.com/lot_foundry");
  });
});
