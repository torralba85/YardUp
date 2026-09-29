/**
 * Labeled zoning designations for evaluating a district classifier, whether
 * Jev or a regex.
 *
 * PROVENANCE — read before trusting a score. Each label is Claude's reading of
 * the named jurisdiction's published zoning-code definition. None was checked
 * by a planner, none was sampled from real traffic, and the same author wrote
 * the classifier prompt. This is a regression and prompt-refinement set, not
 * independent accuracy evidence. Before any threshold acts on a class, add real
 * Regrid rows from `jev_zoning_shadow` log events and have someone else label
 * them.
 *
 * `alsoAccept` lists other classes a reasonable reader would also give the same
 * designation (an agricultural-residential zone is single-family housing on
 * large lots). Cases where the right answer is genuinely arguable are kept out.
 */
import type { ZoningClass } from "@/lib/server/zoning-classifier";

export interface LabeledZoningCase {
  id: string;
  state: string;
  county?: string;
  zoning: string;
  description?: string;
  label: ZoningClass;
  alsoAccept?: readonly ZoningClass[];
  note?: string;
}

/** Every class that counts as a correct answer for the case. */
export function acceptedClasses(testCase: LabeledZoningCase): ZoningClass[] {
  return [testCase.label, ...(testCase.alsoAccept ?? [])];
}

export const LABELED_ZONING_CASES: readonly LabeledZoningCase[] = [
  // Los Angeles
  { id: "la-r1-1", state: "CA", county: "Los Angeles", zoning: "R1-1", label: "single_family" },
  { id: "la-re40-1", state: "CA", county: "Los Angeles", zoning: "RE40-1", label: "single_family", note: "Residential Estate" },
  { id: "la-ra-1", state: "CA", county: "Los Angeles", zoning: "RA-1", label: "single_family", alsoAccept: ["agricultural_rural"], note: "Residential Agricultural" },
  { id: "la-q-r2-1", state: "CA", county: "Los Angeles", zoning: "[Q]R2-1", label: "small_lot_duplex", note: "Qualified two-family" },
  { id: "la-rd1-5-1", state: "CA", county: "Los Angeles", zoning: "RD1.5-1", label: "multifamily", note: "Restricted Density Multiple Dwelling" },
  { id: "la-r3-1", state: "CA", county: "Los Angeles", zoning: "R3-1", label: "multifamily" },
  { id: "la-c2-1", state: "CA", county: "Los Angeles", zoning: "C2-1", label: "commercial" },
  { id: "la-m1-1", state: "CA", county: "Los Angeles", zoning: "M1-1", label: "industrial", note: "Limited Industrial" },
  { id: "la-pf-1", state: "CA", county: "Los Angeles", zoning: "PF-1", label: "planned_special", note: "Public Facilities" },

  // San Diego
  { id: "sd-rs-1-7", state: "CA", county: "San Diego", zoning: "RS-1-7", label: "single_family", note: "Residential Single Unit" },
  { id: "sd-rx-1-1", state: "CA", county: "San Diego", zoning: "RX-1-1", label: "small_lot_duplex", alsoAccept: ["single_family"], note: "Residential Small Lot" },
  { id: "sd-rt-1-1", state: "CA", county: "San Diego", zoning: "RT-1-1", label: "small_lot_duplex", alsoAccept: ["multifamily"], note: "Residential Townhouse" },
  { id: "sd-rm-1-1", state: "CA", county: "San Diego", zoning: "RM-1-1", label: "multifamily", note: "Residential Multiple Unit" },
  { id: "sd-cc-3-3", state: "CA", county: "San Diego", zoning: "CC-3-3", label: "commercial", note: "Commercial Community" },
  { id: "sd-il-2-1", state: "CA", county: "San Diego", zoning: "IL-2-1", label: "industrial", note: "Industrial Light" },
  { id: "sd-ar-1-1", state: "CA", county: "San Diego", zoning: "AR-1-1", label: "agricultural_rural", alsoAccept: ["single_family"], note: "Agricultural Residential" },

  // Seattle
  { id: "sea-nr3", state: "WA", county: "King", zoning: "NR3", label: "single_family", note: "Neighborhood Residential 3; a substring match reads it as R-3" },
  { id: "sea-lr2", state: "WA", county: "King", zoning: "LR2", label: "multifamily", note: "Lowrise 2" },
  { id: "sea-mr", state: "WA", county: "King", zoning: "MR", label: "multifamily", note: "Midrise" },
  { id: "sea-nc2-55", state: "WA", county: "King", zoning: "NC2-55", label: "commercial", alsoAccept: ["mixed_use"], note: "Neighborhood Commercial 2" },
  { id: "sea-ig1", state: "WA", county: "King", zoning: "IG1 U/85", label: "industrial", note: "Industrial General 1" },
  { id: "sea-sm-slu", state: "WA", county: "King", zoning: "SM-SLU 175/85-280", label: "mixed_use", note: "Seattle Mixed, South Lake Union" },

  // Portland
  { id: "pdx-r5", state: "OR", county: "Multnomah", zoning: "R5", label: "single_family", note: "Residential 5,000" },
  { id: "pdx-rm2", state: "OR", county: "Multnomah", zoning: "RM2", label: "multifamily", note: "Residential Multi-Dwelling 2" },
  { id: "pdx-cm2", state: "OR", county: "Multnomah", zoning: "CM2", label: "mixed_use", alsoAccept: ["commercial"], note: "Commercial/Mixed Use 2" },
  { id: "pdx-eg1", state: "OR", county: "Multnomah", zoning: "EG1", label: "industrial", alsoAccept: ["commercial"], note: "General Employment 1" },
  { id: "pdx-rf", state: "OR", county: "Multnomah", zoning: "RF", label: "agricultural_rural", note: "Residential Farm/Forest" },

  // Austin
  { id: "atx-sf-3-np", state: "TX", county: "Travis", zoning: "SF-3-NP", label: "single_family", note: "Family Residence with neighborhood plan" },
  { id: "atx-sf-6", state: "TX", county: "Travis", zoning: "SF-6", label: "small_lot_duplex", alsoAccept: ["multifamily"], note: "Townhouse and Condominium Residence" },
  { id: "atx-mf-3", state: "TX", county: "Travis", zoning: "MF-3", label: "multifamily" },
  { id: "atx-gr-mu", state: "TX", county: "Travis", zoning: "GR-MU", label: "mixed_use", alsoAccept: ["commercial"], note: "Community Commercial with Mixed Use combining district" },
  { id: "atx-li", state: "TX", county: "Travis", zoning: "LI", label: "industrial", note: "Limited Industrial Services" },
  { id: "atx-i-rr", state: "TX", county: "Travis", zoning: "I-RR", label: "agricultural_rural", alsoAccept: ["single_family"], note: "Interim Rural Residence" },

  // Phoenix
  { id: "phx-r1-6", state: "AZ", county: "Maricopa", zoning: "R1-6", label: "single_family" },
  { id: "phx-r-3", state: "AZ", county: "Maricopa", zoning: "R-3", label: "multifamily" },
  { id: "phx-a-1", state: "AZ", county: "Maricopa", zoning: "A-1", label: "industrial", note: "Light Industrial in Phoenix; agricultural in many other places" },
  { id: "phx-c-2", state: "AZ", county: "Maricopa", zoning: "C-2", label: "commercial", note: "Intermediate Commercial" },

  // Elsewhere
  { id: "cobb-r-20", state: "GA", county: "Cobb", zoning: "R-20", label: "single_family", note: "20,000 sq ft single-family; a substring match reads it as R-2" },
  { id: "mdc-ru-1", state: "FL", county: "Miami-Dade", zoning: "RU-1", label: "single_family" },
  { id: "mdc-ru-3", state: "FL", county: "Miami-Dade", zoning: "RU-3", label: "multifamily", note: "Four-unit apartment house" },
  { id: "mdc-bu-1a", state: "FL", county: "Miami-Dade", zoning: "BU-1A", label: "commercial", note: "Business, limited" },
  { id: "mdc-iu-1", state: "FL", county: "Miami-Dade", zoning: "IU-1", label: "industrial", note: "Industrial, light manufacturing" },

  // With a provider description, as Regrid supplies where licensed
  { id: "desc-single-family", state: "CO", county: "Jefferson", zoning: "R-1", description: "Single Family Residential", label: "single_family" },
  { id: "desc-commercial", state: "TX", county: "Harris", zoning: "C-2", description: "General Commercial", label: "commercial" },
  { id: "desc-industrial", state: "OH", county: "Franklin", zoning: "M-1", description: "Light Industrial", label: "industrial" },
  { id: "desc-pud", state: "NC", county: "Mecklenburg", zoning: "PUD", description: "Planned Unit Development", label: "planned_special" },
  { id: "desc-agricultural", state: "CO", county: "Weld", zoning: "A", description: "Agricultural", label: "agricultural_rural" },

  // Unreadable: the right answer is to decline
  { id: "unclear-made-up-code", state: "WA", county: "Pierce", zoning: "QX-77", label: "unclear", note: "No such designation" },
  { id: "unclear-bare-number", state: "OH", county: "Franklin", zoning: "9", label: "unclear" },
];
