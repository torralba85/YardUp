export const DATABASE_NAME = "adu-advisor.db";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inspiration_items (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_saved_items (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT NOT NULL,
  inspirationId TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS concept_thumbnails (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regulation_guides (
  jurisdiction TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  verifiedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS property_records (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT NOT NULL,
  payload TEXT NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contractor_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_requests (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT NOT NULL,
  contractorId TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parcel_summaries (
  id TEXT PRIMARY KEY NOT NULL,
  jurisdiction TEXT NOT NULL,
  payload TEXT NOT NULL,
  verifiedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`;
