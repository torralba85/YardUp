import { describe, expect, it } from "vitest";
import { JADU_FAQS, JADU_GLANCE, JADU_SECTIONS, JADU_SOURCES } from "@/content/adu/ca/jadu";
import {
  STATE_BASELINE_PARAGRAPHS,
  STATE_BASELINE_SOURCES,
} from "@/content/adu/state-baseline";
import { ADU_CITIES, ADU_COST_PAGES } from "@/lib/adu/content";

const RETIRED_CITATIONS = [
  { label: "retired Gov. Code §66324 (renumbered to §66311.5)", pattern: /\b66324\b/ },
  { label: "retired Gov. Code §65852.2 (recodified into §§66310-66342)", pattern: /\b65852\.2(?!7)\b/ },
];

function collectStrings(value: unknown, path = "root", out: Array<{ path: string; text: string }> = []) {
  if (typeof value === "string") {
    out.push({ path, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      collectStrings(entry, `${path}.${key}`, out);
    }
  }
  return out;
}

describe("adu runtime statute citations", () => {
  it("never emits retired California ADU statutory section numbers in published content", () => {
    const buckets: Array<[string, unknown]> = [
      ["state-baseline", { STATE_BASELINE_PARAGRAPHS, STATE_BASELINE_SOURCES }],
      ["jadu", { JADU_GLANCE, JADU_SECTIONS, JADU_FAQS, JADU_SOURCES }],
      ...ADU_CITIES.map((city): [string, unknown] => [`city:${city.slug}`, city]),
      ...ADU_COST_PAGES.map((cost): [string, unknown] => [`cost:${cost.slug}`, cost]),
    ];

    for (const [name, payload] of buckets) {
      for (const { path, text } of collectStrings(payload)) {
        for (const { label, pattern } of RETIRED_CITATIONS) {
          expect(text, `${name} (${path}) contains ${label}: "${text}"`).not.toMatch(pattern);
        }
      }
    }
  });
});
