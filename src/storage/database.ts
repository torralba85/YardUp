import * as SQLite from "expo-sqlite";

import { contractorProfiles } from "../data/contractors";
import { inspirationItems } from "../data/inspiration";
import { parcelSummaries } from "../data/parcelSummaries";
import { regulationGuides } from "../data/regulations";
import { starterProject } from "../data/sampleProject";
import type {
  ContractorProfile,
  DesignConcept,
  InspirationItem,
  ParcelSummary,
  Project,
  ProjectSavedItem,
  PropertyRecord,
  QuoteRequest,
  RegulationGuide,
} from "../domain/types";
import { DATABASE_NAME, SCHEMA_SQL } from "./schema";

type JsonEntity =
  | Project
  | InspirationItem
  | ProjectSavedItem
  | DesignConcept
  | RegulationGuide
  | PropertyRecord
  | ContractorProfile
  | QuoteRequest
  | ParcelSummary;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  dbPromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  return dbPromise;
}

export async function initializeDatabase() {
  const db = await getDb();
  await db.execAsync(SCHEMA_SQL);
  await seedStaticData(db);
}

async function seedStaticData(db: SQLite.SQLiteDatabase) {
  const now = new Date().toISOString();
  const projectCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM projects");

  if (!projectCount?.count) {
    await upsertProject(starterProject);
  }

  for (const item of inspirationItems) {
    await db.runAsync(
      "INSERT OR REPLACE INTO inspiration_items (id, payload, updatedAt) VALUES (?, ?, ?)",
      item.id,
      serialize(item),
      now,
    );
  }

  for (const guide of Object.values(regulationGuides)) {
    await db.runAsync(
      "INSERT OR REPLACE INTO regulation_guides (jurisdiction, payload, verifiedAt) VALUES (?, ?, ?)",
      guide.jurisdiction,
      serialize(guide),
      guide.verifiedAt,
    );
  }

  for (const contractor of contractorProfiles) {
    await db.runAsync(
      "INSERT OR REPLACE INTO contractor_profiles (id, payload, updatedAt) VALUES (?, ?, ?)",
      contractor.id,
      serialize(contractor),
      now,
    );
  }

  for (const parcel of parcelSummaries) {
    await db.runAsync(
      "INSERT OR REPLACE INTO parcel_summaries (id, jurisdiction, payload, verifiedAt) VALUES (?, ?, ?, ?)",
      parcel.id,
      parcel.jurisdiction,
      serialize(parcel),
      parcel.verifiedAt,
    );
  }
}

export async function loadProjects(): Promise<Project[]> {
  return selectPayloads<Project>("SELECT payload FROM projects ORDER BY updatedAt DESC");
}

export async function loadInspirationItems(): Promise<InspirationItem[]> {
  return selectPayloads<InspirationItem>("SELECT payload FROM inspiration_items ORDER BY updatedAt DESC");
}

export async function loadSavedItems(projectId?: string): Promise<ProjectSavedItem[]> {
  if (projectId) {
    return selectPayloads<ProjectSavedItem>(
      "SELECT payload FROM project_saved_items WHERE projectId = ? ORDER BY createdAt DESC",
      projectId,
    );
  }

  return selectPayloads<ProjectSavedItem>("SELECT payload FROM project_saved_items ORDER BY createdAt DESC");
}

export async function loadDesignConcepts(projectId?: string): Promise<DesignConcept[]> {
  if (projectId) {
    return selectPayloads<DesignConcept>(
      "SELECT payload FROM concept_thumbnails WHERE projectId = ? ORDER BY createdAt DESC",
      projectId,
    );
  }

  return selectPayloads<DesignConcept>("SELECT payload FROM concept_thumbnails ORDER BY createdAt DESC");
}

export async function loadRegulationGuides(): Promise<RegulationGuide[]> {
  return selectPayloads<RegulationGuide>("SELECT payload FROM regulation_guides ORDER BY jurisdiction ASC");
}

export async function loadPropertyRecords(projectId: string): Promise<PropertyRecord[]> {
  return selectPayloads<PropertyRecord>("SELECT payload FROM property_records WHERE projectId = ? ORDER BY date DESC", projectId);
}

export async function loadContractorProfiles(): Promise<ContractorProfile[]> {
  return selectPayloads<ContractorProfile>("SELECT payload FROM contractor_profiles ORDER BY updatedAt DESC");
}

export async function loadQuoteRequests(projectId?: string): Promise<QuoteRequest[]> {
  if (projectId) {
    return selectPayloads<QuoteRequest>(
      "SELECT payload FROM quote_requests WHERE projectId = ? ORDER BY createdAt DESC",
      projectId,
    );
  }

  return selectPayloads<QuoteRequest>("SELECT payload FROM quote_requests ORDER BY createdAt DESC");
}

export async function loadParcelSummaries(): Promise<ParcelSummary[]> {
  return selectPayloads<ParcelSummary>("SELECT payload FROM parcel_summaries ORDER BY jurisdiction ASC");
}

export async function upsertProject(project: Project) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO projects (id, payload, updatedAt) VALUES (?, ?, ?)",
    project.id,
    serialize(project),
    project.updatedAt,
  );
}

export async function upsertSavedItem(item: ProjectSavedItem) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO project_saved_items (id, projectId, inspirationId, payload, createdAt) VALUES (?, ?, ?, ?, ?)",
    item.id,
    item.projectId,
    item.inspirationId,
    serialize(item),
    item.createdAt,
  );
}

export async function upsertDesignConcept(concept: DesignConcept) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO concept_thumbnails (id, projectId, payload, createdAt) VALUES (?, ?, ?, ?)",
    concept.id,
    concept.projectId,
    serialize(concept),
    concept.createdAt,
  );
}

export async function upsertPropertyRecords(records: PropertyRecord[]) {
  const db = await getDb();
  for (const record of records) {
    await db.runAsync(
      "INSERT OR REPLACE INTO property_records (id, projectId, payload, date) VALUES (?, ?, ?, ?)",
      record.id,
      record.projectId,
      serialize(record),
      record.date,
    );
  }
}

export async function upsertQuoteRequest(request: QuoteRequest) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO quote_requests (id, projectId, contractorId, payload, createdAt) VALUES (?, ?, ?, ?, ?)",
    request.id,
    request.projectId,
    request.contractorId,
    serialize(request),
    request.createdAt,
  );
}

async function selectPayloads<T extends JsonEntity>(query: string, ...params: string[]): Promise<T[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ payload: string }>(query, ...params);
  return rows.map((row) => JSON.parse(row.payload) as T);
}

function serialize(entity: JsonEntity): string {
  return JSON.stringify(entity);
}
