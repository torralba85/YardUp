import type { EstimateInput, EstimateResult } from "./types";

export const defaultEstimateInput: EstimateInput = {
  aduType: "detached",
  aduSqFt: 650,
  buildCostPerSqFt: 385,
  softCostRate: 0.18,
  contingencyRate: 0.12,
  monthlyRent: 2850,
  opExRate: 0.22,
  capRate: 0.055,
};

export function estimateAduValue(input: EstimateInput): EstimateResult {
  const hardCost = input.aduSqFt * input.buildCostPerSqFt;
  const softCosts = hardCost * input.softCostRate;
  const contingency = hardCost * input.contingencyRate;
  const totalCost = hardCost + softCosts + contingency;
  const annualRent = input.monthlyRent * 12;
  const annualOpEx = annualRent * input.opExRate;
  const annualNOI = annualRent - annualOpEx;
  const incomeValue = annualNOI / input.capRate;

  return {
    lowValue: roundCurrency(incomeValue * 0.9),
    highValue: roundCurrency(incomeValue * 1.1),
    annualRent: roundCurrency(annualRent),
    annualOpEx: roundCurrency(annualOpEx),
    annualNOI: roundCurrency(annualNOI),
    totalCost: roundCurrency(totalCost),
    roi: annualNOI / totalCost,
    paybackYears: totalCost / Math.max(annualNOI, 1),
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}m`;
  }
  return `$${Math.round(value / 1000)}k`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function roundCurrency(value: number): number {
  return Math.round(value / 100) * 100;
}
