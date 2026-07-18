import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("auth focus color roles", () => {
  it("uses clay ink for light-surface auth inputs and selected roles", () => {
    const forgotPassword = source("app/forgot-password/page.tsx");
    const signup = source("app/signup/page.tsx");

    expect(forgotPassword).toContain("focus:border-lf-clay-ink");
    expect(forgotPassword).toContain("focus:ring-lf-clay-ink/20");
    expect(signup.match(/focus:border-lf-clay-ink/g)).toHaveLength(3);
    expect(signup.match(/focus:ring-lf-clay-ink\/20/g)).toHaveLength(3);
    expect(signup).toContain("ring-2 ring-lf-clay-ink/20");
  });
});
