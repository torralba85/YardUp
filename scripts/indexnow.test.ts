// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { diffSitemapStates, OWNERSHIP_PROOF, parseSitemap, run } from "./indexnow.mjs";
import sitemap from "@/app/sitemap";
import { buildAduSitemapXml } from "@/app/sitemap-adu.xml/build-xml";

const ORIGIN = "https://lotfoundry.net";

function sitemapXml(state: Record<string, string>) {
  const urls = Object.entries(state)
    .map(([loc, lastmod]) => `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset>${urls}</urlset>`;
}

/** Serves both sitemaps, the key file, and IndexNow, the way production does. */
function fakeSite(core: Record<string, string>, adu: Record<string, string>, indexNowStatus = 202) {
  return vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    if (url.href === "https://api.indexnow.org/indexnow") {
      expect(init?.method).toBe("POST");
      return new Response(null, { status: indexNowStatus });
    }
    if (url.pathname === "/sitemap.xml") return new Response(sitemapXml(core));
    if (url.pathname === "/sitemap-adu.xml") return new Response(sitemapXml(adu));
    if (url.pathname === `/${OWNERSHIP_PROOF}.txt`) return new Response(`${OWNERSHIP_PROOF}\n`);
    return new Response("not found", { status: 404 });
  });
}

function submittedUrls(fetchMock: ReturnType<typeof fakeSite>) {
  const post = fetchMock.mock.calls.find(([input]) => input === "https://api.indexnow.org/indexnow");
  return post ? JSON.parse(String(post[1]?.body)).urlList : undefined;
}

function io(fetchImpl: ReturnType<typeof fakeSite>, files: Record<string, string> = {}) {
  const lines: string[] = [];
  return {
    lines,
    files,
    fetchImpl,
    readFile: async (file: string) => {
      if (!(file in files)) throw new Error(`ENOENT: ${file}`);
      return files[file];
    },
    writeFile: async (file: string, data: string) => {
      files[file] = data;
    },
    log: (line: string) => lines.push(line),
  };
}

const core = { [`${ORIGIN}/`]: "2026-11-01", [`${ORIGIN}/help`]: "2026-10-21" };
const adu = { [`${ORIGIN}/adu/ca`]: "2026-10-30", [`${ORIGIN}/adu/ca/vista`]: "2026-10-30" };

describe("parseSitemap", () => {
  it("maps each <loc> to its <lastmod>, unescaping XML and tolerating whitespace", () => {
    const xml = `<urlset>
      <url>
        <loc> ${ORIGIN}/adu?a=1&amp;b=2 </loc>
        <lastmod>2026-10-30</lastmod>
      </url>
      <url><loc>${ORIGIN}/help</loc></url>
    </urlset>`;
    expect(parseSitemap(xml)).toEqual({
      [`${ORIGIN}/adu?a=1&b=2`]: "2026-10-30",
      [`${ORIGIN}/help`]: null,
    });
  });
});

describe("diffSitemapStates", () => {
  it("reports nothing when no URL or lastmod moved", () => {
    expect(diffSitemapStates({ ...core, ...adu }, { ...core, ...adu })).toEqual({
      added: [],
      removed: [],
      changed: [],
    });
  });

  it("separates added, removed and re-dated URLs", () => {
    const before = { ...core, ...adu };
    const after = { ...core, [`${ORIGIN}/help`]: "2026-11-03", [`${ORIGIN}/adu/ca`]: "2026-10-30", [`${ORIGIN}/adu/ca/rent`]: "2026-11-03" };
    expect(diffSitemapStates(before, after)).toEqual({
      added: [`${ORIGIN}/adu/ca/rent`],
      removed: [`${ORIGIN}/adu/ca/vista`],
      changed: [`${ORIGIN}/help`],
    });
  });
});

describe("sitemap lastmod is a content date, so it is a usable change signal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders identical dates for builds made on different days", () => {
    const render = () => ({
      core: sitemap().map(({ url, lastModified }) => [url, lastModified]),
      adu: parseSitemap(buildAduSitemapXml()),
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    const first = render();
    vi.setSystemTime(new Date("2027-02-14T08:30:00Z"));
    expect(render()).toEqual(first);
    for (const lastmod of Object.values(first.adu)) expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("indexnow-submit CLI", () => {
  it("--snapshot records the live, cache-busted sitemap dates", async () => {
    const fetchMock = fakeSite(core, adu);
    const cli = io(fetchMock);
    expect(await run(["--snapshot", "before.json"], cli)).toBe(0);
    expect(JSON.parse(cli.files["before.json"])).toEqual({ ...core, ...adu });
    for (const [input] of fetchMock.mock.calls) expect(new URL(input).searchParams.has("v")).toBe(true);
    expect(submittedUrls(fetchMock)).toBeUndefined();
  });

  it("--baseline submits nothing, and says so, when the deploy changed no sitemap URL", async () => {
    const fetchMock = fakeSite(core, adu);
    const cli = io(fetchMock, { "before.json": JSON.stringify({ ...core, ...adu }) });
    expect(await run(["--baseline", "before.json"], cli)).toBe(0);
    expect(submittedUrls(fetchMock)).toBeUndefined();
    expect(cli.lines.join("\n")).toMatch(/nothing submitted/);
  });

  it("--baseline submits only added, re-dated and removed URLs", async () => {
    const before = { ...core, ...adu };
    const fetchMock = fakeSite(
      { ...core, [`${ORIGIN}/help`]: "2026-11-03" },
      { [`${ORIGIN}/adu/ca`]: "2026-10-30", [`${ORIGIN}/adu/ca/rent`]: "2026-11-03" },
    );
    const cli = io(fetchMock, { "before.json": JSON.stringify(before) });
    expect(await run(["--baseline", "before.json"], cli)).toBe(0);
    expect(submittedUrls(fetchMock)).toEqual([
      `${ORIGIN}/adu/ca/rent`,
      `${ORIGIN}/help`,
      `${ORIGIN}/adu/ca/vista`,
    ]);
    const post = fetchMock.mock.calls.find(([input]) => input === "https://api.indexnow.org/indexnow");
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      host: "lotfoundry.net",
      key: OWNERSHIP_PROOF,
      keyLocation: `${ORIGIN}/${OWNERSHIP_PROOF}.txt`,
    });
    expect(cli.lines.at(-1)).toBe("IndexNow: 202 for 3 URLs");
  });

  it("--baseline without a readable snapshot submits nothing instead of everything", async () => {
    const fetchMock = fakeSite(core, adu);
    const cli = io(fetchMock);
    expect(await run(["--baseline", "missing.json"], cli)).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cli.lines.join("\n")).toMatch(/no readable pre-deploy snapshot.*nothing submitted/);
  });

  it("returns a non-zero code, without throwing, when IndexNow rejects the batch", async () => {
    const fetchMock = fakeSite({ ...core, [`${ORIGIN}/help`]: "2026-11-03" }, adu, 429);
    const cli = io(fetchMock, { "before.json": JSON.stringify({ ...core, ...adu }) });
    expect(await run(["--baseline", "before.json"], cli)).toBe(1);
    expect(cli.lines.at(-1)).toBe("IndexNow: 429 for 1 URL");
  });

  it("--all submits every sitemap URL, for hand runs only", async () => {
    const fetchMock = fakeSite(core, adu, 200);
    expect(await run(["--all"], io(fetchMock))).toBe(0);
    expect(submittedUrls(fetchMock)).toEqual(Object.keys({ ...core, ...adu }));
  });

  it("prints usage instead of guessing a mode", async () => {
    const fetchMock = fakeSite(core, adu);
    const cli = io(fetchMock);
    expect(await run([], cli)).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cli.lines.join("\n")).toMatch(/--snapshot <file>/);
  });
});
