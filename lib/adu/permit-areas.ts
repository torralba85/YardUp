import { SAN_DIEGO_PERMIT_STUDY, type PermitArea } from "@/content/adu/ca/san-diego-permits";
import { permitStudyPath, permitStudyUrl } from "./content";
import { laterDate } from "./dates";

export const PERMIT_AREA_PUBLISHED = "2026-11-16";
export const PERMIT_AREA_MIN_APPROVALS = 50;
export const PERMIT_AREAS = SAN_DIEGO_PERMIT_STUDY.byArea.filter(
  (area) => area.approvals >= PERMIT_AREA_MIN_APPROVALS,
);

export function permitAreaSlug(area: PermitArea): string {
  return area.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function permitAreaPath(area: PermitArea): string {
  return `${permitStudyPath()}/${permitAreaSlug(area)}`;
}

export function permitAreaUrl(area: PermitArea): string {
  return `${permitStudyUrl()}/${permitAreaSlug(area)}`;
}

export function findPermitArea(slug: string): PermitArea | undefined {
  return PERMIT_AREAS.find((area) => permitAreaSlug(area) === slug);
}

export function permitAreaLastModified(): string {
  return laterDate(PERMIT_AREA_PUBLISHED, SAN_DIEGO_PERMIT_STUDY.generatedAt);
}
