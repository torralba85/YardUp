import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const FIREBASE_LINK_RE =
  /href\s*=\s*["'`]\/(builder|certificates|delete-account|feedback|forgot-password|login|settings|signup|studio)(?:[/?#"'`]|$)/;

const SCAN_ROOTS = [
  "app",
  "components/adu",
  "components/landing",
  "components/legal",
  "components/ui",
];

function collectTsxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const rel = path.relative(REPO_ROOT, full).replace(/\\/g, "/");
      if (rel === "app/(firebase)" || rel === "app/api") continue;
      out.push(...collectTsxFiles(full));
    } else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("Firebase route-group prefetch isolation", () => {
  it("sets prefetch={false} on every <Link> from Firebase-free pages into app/(firebase)", () => {
    const violations: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const file of collectTsxFiles(path.join(REPO_ROOT, root))) {
        const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
        const rel = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
        for (let i = 0; i < lines.length; i += 1) {
          if (!FIREBASE_LINK_RE.test(lines[i])) continue;
          const window = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 4)).join(" ");
          if (/<Link\b/.test(window) && !/prefetch\s*=\s*\{\s*false\s*\}/.test(window)) {
            violations.push(`${rel}:${i + 1} (${lines[i].trim()})`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
