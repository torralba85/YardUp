import { describe, expect, it } from "vitest";
import {
  CLOUDFLARE_BEACON_LOADER,
  CLOUDFLARE_BEACON_SRC,
  CLOUDFLARE_BEACON_ID,
} from "./cloudflare-beacon";
import { INTERNAL_ANALYTICS_MARKER } from "./consent";

interface RunOptions {
  hostname: string;
  webdriver?: boolean;
  session?: Record<string, string>;
  sessionThrows?: boolean;
}

/** Runs the inline loader against stand-in globals and returns what it appended. */
function runLoader({ hostname, webdriver, session = {}, sessionThrows = false }: RunOptions) {
  const doc = document.implementation.createHTMLDocument("beacon");
  const storage = {
    getItem(key: string) {
      if (sessionThrows) throw new Error("storage blocked");
      return session[key] ?? null;
    },
  };
  const run = new Function("location", "navigator", "document", "sessionStorage", CLOUDFLARE_BEACON_LOADER);
  run({ hostname }, { webdriver }, doc, storage);
  return Array.from(doc.body.querySelectorAll("script"));
}

describe("Cloudflare Web Analytics loader", () => {
  it("loads the beacon on the production host", () => {
    const [script, ...rest] = runLoader({ hostname: "lotfoundry.net" });

    expect(rest).toHaveLength(0);
    expect(script.getAttribute("src")).toBe(CLOUDFLARE_BEACON_SRC);
    expect(script.defer).toBe(true);
    expect(JSON.parse(script.getAttribute("data-cf-beacon")!)).toEqual({ token: CLOUDFLARE_BEACON_ID });
  });

  it("loads the beacon on www before the redirect lands", () => {
    expect(runLoader({ hostname: "www.lotfoundry.net" })).toHaveLength(1);
  });

  it.each(["localhost", "127.0.0.1", "yardup-2026.web.app", "evil-lotfoundry.net"])(
    "stays off on %s",
    (hostname) => {
      expect(runLoader({ hostname })).toHaveLength(0);
    },
  );

  it("stays off for automated browsers on the production host", () => {
    expect(runLoader({ hostname: "lotfoundry.net", webdriver: true })).toHaveLength(0);
  });

  it("stays off for sessions marked internal", () => {
    expect(
      runLoader({ hostname: "lotfoundry.net", session: { [INTERNAL_ANALYTICS_MARKER]: "1" } }),
    ).toHaveLength(0);
  });

  it("still loads when session storage is blocked", () => {
    expect(runLoader({ hostname: "lotfoundry.net", sessionThrows: true })).toHaveLength(1);
  });
});
