import { describe, expect, it } from "vitest";
import {
  formatCompactDollars,
  formatDecimal,
  formatDollars,
  formatNumber,
  formatPercent,
  formatUtcDate,
} from "./intl-format";

describe("intl-format", () => {
  it("formats whole numbers, decimals, dollars, and compact dollars", () => {
    expect(formatNumber(1200)).toBe("1,200");
    expect(formatDecimal(7.46, 1)).toBe("7.5");
    expect(formatDecimal(0.423, 2)).toBe("0.42");
    expect(formatDollars(2615)).toBe("$2,615");
    expect(formatCompactDollars(251340)).toBe("$251K");
    expect(formatCompactDollars(12500, 1)).toBe("$12.5K");
    expect(formatCompactDollars(850)).toBe("$850");
  });

  it("formats percentages with optional decimal and sign", () => {
    expect(formatPercent(0.25)).toBe("25%");
    expect(formatPercent(0.184, { digits: 1 })).toBe("18.4%");
    expect(formatPercent(0.18, { digits: 1, trimTrailingZero: true })).toBe("18%");
    expect(formatPercent(0.123, { digits: 1, signed: true })).toBe("+12.3%");
    expect(formatPercent(-0.05, { digits: 1, signed: true })).toBe("-5.0%");
  });

  it("formats UTC dates deterministically without timezone drift", () => {
    expect(formatUtcDate("2026-10-07", "long")).toBe("October 7, 2026");
    expect(formatUtcDate("2026-10-07", "short")).toBe("Oct 7, 2026");
    expect(formatUtcDate("2026-10-07", "monthDayLong")).toBe("October 7");
    expect(formatUtcDate("2026-10-07", "monthDayShort")).toBe("Oct 7");
  });
});
