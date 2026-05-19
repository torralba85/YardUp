import { describe, expect, it } from "vitest";

import { SCHEMA_SQL } from "./schema";

describe("SQLite schema", () => {
  it("creates the required offline MVP tables", () => {
    for (const table of [
      "projects",
      "inspiration_items",
      "project_saved_items",
      "concept_thumbnails",
      "regulation_guides",
      "property_records",
      "contractor_profiles",
      "quote_requests",
      "parcel_summaries",
      "sync_queue",
    ]) {
      expect(SCHEMA_SQL).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("keeps project-linked tables queryable by projectId", () => {
    expect(SCHEMA_SQL).toContain("projectId TEXT NOT NULL");
    expect(SCHEMA_SQL).toContain("inspirationId TEXT NOT NULL");
    expect(SCHEMA_SQL).toContain("contractorId TEXT NOT NULL");
    expect(SCHEMA_SQL).toContain("entityType TEXT NOT NULL");
  });

  it("persists quote requests and parcel summaries as payload-backed entities", () => {
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS quote_requests");
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS parcel_summaries");
    expect(SCHEMA_SQL).toContain("jurisdiction TEXT NOT NULL");
    expect(SCHEMA_SQL).toContain("verifiedAt TEXT NOT NULL");
  });
});
