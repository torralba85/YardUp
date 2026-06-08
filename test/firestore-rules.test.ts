import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("firestore.rules builder response status updates", () => {
  const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf8");

  it("limits inline builderResponseStatuses updates to the authenticated builder key", () => {
    expect(rules).toContain("isValidBuilderResponseStatusMapUpdate(request.auth.uid)");
    expect(rules).toContain(".diff(resource.data.builderResponseStatuses)");
    expect(rules).toContain(".hasOnly([builderId])");
    expect(rules).toContain("request.resource.data.builderResponseStatuses.keys().hasOnly([builderId])");
    expect(rules).toContain("request.resource.data.updatedAt == request.time");
  });

  it("limits nested builder response document updates to status and updatedAt", () => {
    expect(rules).toContain("isValidBuilderResponseDocumentUpdate(builderId)");
    expect(rules).toContain("isBuilderResponseUpdateStatus(request.resource.data.status)");
    expect(rules).toContain('affectedKeys().hasOnly(["status", "updatedAt"])');
  });
});
