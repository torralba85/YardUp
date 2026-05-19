import { describe, expect, it } from "vitest";

import { buildStarterPropertyHistory } from "./propertyHistory";

describe("buildStarterPropertyHistory", () => {
  it("returns source-cited records scoped to the project", () => {
    const records = buildStarterPropertyHistory("1420 Baxter St, Los Angeles, CA", "project-1");

    expect(records).toHaveLength(2);
    expect(records.every((record) => record.projectId === "project-1")).toBe(true);
    expect(records.every((record) => record.citationUrl.startsWith("https://"))).toBe(true);
    expect(records[0].source).toContain("Los Angeles");
  });
});
