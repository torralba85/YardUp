import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("auth focus color roles", () => {
  it("uses deep-orange focus and carbon selected roles on chalk auth surfaces", () => {
    // These live in the `(firebase)` route group; the parentheses are part of
    // the on-disk path even though the URLs are unchanged.
    const forgotPassword = source("app/(firebase)/forgot-password/page.tsx");
    const signup = source("app/(firebase)/signup/page.tsx");
    const fields = source("components/ui/Field.tsx");

    expect(forgotPassword).toContain('import { Input } from "@/components/ui/Field"');
    expect(forgotPassword).toContain("<Input");
    expect(signup).toContain('import { Input } from "@/components/ui/Field"');
    expect(signup.match(/<Input\b/g)).toHaveLength(3);
    expect(fields).toContain("focus-visible:ring-2 focus-visible:ring-lot-orange-ink");
    expect(signup).toContain("border-lf-espresso bg-lf-espresso");
    expect(signup).toContain("{...radioProps}");
  });
});
