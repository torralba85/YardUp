import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ai-maintainer.yml"),
  "utf8",
);

describe("AI maintainer workflow", () => {
  it("can post issue intake comments without a hard-coded diagnosis", () => {
    expect(workflow).toMatch(/permissions:\s*\n\s+contents: read\s*\n\s+issues: write/);
    expect(workflow).toContain("AI Maintainer intake");
    expect(workflow).not.toContain("authentication module");
    expect(workflow).not.toContain("OPENAI_API_KEY");
  });
});
