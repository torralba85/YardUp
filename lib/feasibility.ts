export type RoofStyle = "shed" | "gable" | "flat";
export type ExteriorFinish = "cedar" | "lap" | "stucco" | "board";
export type RentScenario = "conservative" | "market" | "optimistic";

export interface ParcelPreset {
  id: string;
  name: string;
  address: string;
  city: string;
  lotArea: number;
  lotWidth: number;
  lotLength: number;
  existingHouseSqft: number;
  maxLotCoveragePercent: number;
  setbacks: {
    front: number;
    rear: number;
    side: number;
  };
  expectedRent: Record<RentScenario, number>;
}

export interface ADUConfig {
  footprint: number;
  width: number;
  length: number;
  height: number;
  roof: RoofStyle;
  finish: ExteriorFinish;
  includeOpenings: boolean;
}

export interface FinancialAssumptions {
  costPerSqft: Record<ExteriorFinish, number>;
  softCostMultiplier: number;
  operatingExpenseRatio: number;
  rentScenario: RentScenario;
}

export interface FeasibilityResult {
  aduSqft: number;
  totalFootprint: number;
  allowedFootprint: number;
  remainingCapacity: number;
  coveragePercent: number;
  maxCoveragePercent: number;
  zoningStatus: "Compliant" | "Review needed";
  costLow: number;
  costHigh: number;
  costPerSqftLow: number;
  costPerSqftHigh: number;
  monthlyRent: number;
  annualNoi: number;
  paybackYears: number;
  warnings: string[];
}

export const parcelPresets: ParcelPreset[] = [
  {
    id: "oak-street",
    name: "Typical R-1 Lot",
    address: "1234 Oak Street",
    city: "Seattle, WA 98115",
    lotArea: 5000,
    lotWidth: 40,
    lotLength: 125,
    existingHouseSqft: 1380,
    maxLotCoveragePercent: 40,
    setbacks: { front: 20, rear: 25, side: 5 },
    expectedRent: { conservative: 2050, market: 2350, optimistic: 2650 },
  },
  {
    id: "corner-lot",
    name: "Corner Family Lot",
    address: "812 Linden Avenue",
    city: "Portland, OR 97212",
    lotArea: 7200,
    lotWidth: 60,
    lotLength: 120,
    existingHouseSqft: 1720,
    maxLotCoveragePercent: 42,
    setbacks: { front: 18, rear: 20, side: 6 },
    expectedRent: { conservative: 2250, market: 2600, optimistic: 2950 },
  },
  {
    id: "compact-lot",
    name: "Compact Urban Lot",
    address: "44 Mesa Court",
    city: "Austin, TX 78704",
    lotArea: 4200,
    lotWidth: 35,
    lotLength: 120,
    existingHouseSqft: 1500,
    maxLotCoveragePercent: 38,
    setbacks: { front: 15, rear: 15, side: 5 },
    expectedRent: { conservative: 1850, market: 2150, optimistic: 2450 },
  },
];

export const footprintOptions = [
  { label: "400 sf", value: 400, width: 20, length: 20, summary: "Studio / office" },
  { label: "600 sf", value: 600, width: 20, length: 30, summary: "1 bed / 1 bath" },
  { label: "800 sf", value: 800, width: 25, length: 32, summary: "Large 1 bed" },
  { label: "1,000 sf", value: 1000, width: 25, length: 40, summary: "2 bed concept" },
];

export const defaultAduConfig: ADUConfig = {
  footprint: 600,
  width: 20,
  length: 30,
  height: 12,
  roof: "shed",
  finish: "cedar",
  includeOpenings: true,
};

export const defaultFinancialAssumptions: FinancialAssumptions = {
  costPerSqft: {
    cedar: 340,
    lap: 315,
    stucco: 330,
    board: 355,
  },
  softCostMultiplier: 1.18,
  operatingExpenseRatio: 0.325,
  rentScenario: "conservative",
};

export const roofLabels: Record<RoofStyle, string> = {
  shed: "Shed",
  gable: "Gable",
  flat: "Flat",
};

export const finishLabels: Record<ExteriorFinish, string> = {
  cedar: "Cedar",
  lap: "Lap Siding",
  stucco: "Stucco",
  board: "Board & Batten",
};

export const finishColors: Record<ExteriorFinish, string> = {
  cedar: "#a66a3c",
  lap: "#c8c4b8",
  stucco: "#d8d2c4",
  board: "#2f3437",
};

export function getParcelById(parcelId: string) {
  return parcelPresets.find((parcel) => parcel.id === parcelId) ?? parcelPresets[0];
}

export function configForFootprint(footprint: number, config: ADUConfig): ADUConfig {
  const option = footprintOptions.find((item) => item.value === footprint) ?? footprintOptions[1];
  return {
    ...config,
    footprint: option.value,
    width: option.width,
    length: option.length,
  };
}

export function calculateFeasibility(
  parcel: ParcelPreset,
  config: ADUConfig,
  assumptions: FinancialAssumptions,
): FeasibilityResult {
  const aduSqft = config.width * config.length;
  const totalFootprint = parcel.existingHouseSqft + aduSqft;
  const allowedFootprint = Math.round(parcel.lotArea * (parcel.maxLotCoveragePercent / 100));
  const remainingCapacity = allowedFootprint - totalFootprint;
  const coveragePercent = (totalFootprint / parcel.lotArea) * 100;
  const baseCostPerSqft = assumptions.costPerSqft[config.finish];
  const roofPremium = config.roof === "gable" ? 18 : config.roof === "flat" ? 8 : 0;
  const openingPremium = config.includeOpenings ? 9000 : 0;
  const hardCost = aduSqft * (baseCostPerSqft + roofPremium) + openingPremium;
  const costMid = hardCost * assumptions.softCostMultiplier;
  const costLow = Math.round((costMid * 0.92) / 1000) * 1000;
  const costHigh = Math.round((costMid * 1.15) / 1000) * 1000;
  const monthlyRent = parcel.expectedRent[assumptions.rentScenario];
  const annualNoi = Math.round(monthlyRent * 12 * (1 - assumptions.operatingExpenseRatio));
  const paybackYears = Number((costMid / annualNoi).toFixed(1));
  const warnings: string[] = [];

  if (remainingCapacity < 0) {
    warnings.push(`Footprint exceeds local coverage allowance by ${Math.abs(remainingCapacity).toLocaleString()} sf.`);
  }

  if (config.height > 16) {
    warnings.push("Height should be reviewed against local accessory structure limits.");
  }

  return {
    aduSqft,
    totalFootprint,
    allowedFootprint,
    remainingCapacity,
    coveragePercent,
    maxCoveragePercent: parcel.maxLotCoveragePercent,
    zoningStatus: remainingCapacity >= 0 ? "Compliant" : "Review needed",
    costLow,
    costHigh,
    costPerSqftLow: Math.round(costLow / aduSqft),
    costPerSqftHigh: Math.round(costHigh / aduSqft),
    monthlyRent,
    annualNoi,
    paybackYears,
    warnings,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }

  return formatCurrency(value);
}
