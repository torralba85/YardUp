/**
 * Shared cached `Intl.NumberFormat` and `Intl.DateTimeFormat` helpers so UI
 * components never hardcode `$${...}`, `.toLocaleString()`, `.toFixed()`, or
 * manual ISO date slicing.
 */

const INTEGER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const DECIMAL_1_FORMAT = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const DECIMAL_2_FORMAT = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CURRENCY_WHOLE_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const CURRENCY_COMPACT_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 0,
});

const CURRENCY_COMPACT_1_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const PERCENT_0_FORMAT = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

const PERCENT_1_FORMAT = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const PERCENT_1_TRIM_FORMAT = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const DATE_LONG_UTC = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const DATE_SHORT_UTC = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DATE_MONTH_DAY_LONG_UTC = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});

const DATE_MONTH_DAY_SHORT_UTC = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

export function formatNumber(value: number): string {
  return INTEGER_FORMAT.format(value);
}

export function formatDecimal(value: number, digits: 1 | 2 = 1): string {
  return digits === 2 ? DECIMAL_2_FORMAT.format(value) : DECIMAL_1_FORMAT.format(value);
}

export function formatDollars(value: number): string {
  return CURRENCY_WHOLE_FORMAT.format(value);
}

export function formatCompactDollars(value: number, maxFractionDigits: 0 | 1 = 0): string {
  if (Math.abs(value) < 1000) {
    return CURRENCY_WHOLE_FORMAT.format(value);
  }
  return maxFractionDigits === 1
    ? CURRENCY_COMPACT_1_FORMAT.format(value)
    : CURRENCY_COMPACT_FORMAT.format(value);
}

/** Formats a decimal ratio (e.g. `0.25` -> `"25%"` or `"25.0%"`). */
export function formatPercent(
  ratio: number,
  options: { digits?: 0 | 1; trimTrailingZero?: boolean; signed?: boolean } = {},
): string {
  const { digits = 0, trimTrailingZero = false, signed = false } = options;
  const formatter =
    digits === 0
      ? PERCENT_0_FORMAT
      : trimTrailingZero
        ? PERCENT_1_TRIM_FORMAT
        : PERCENT_1_FORMAT;
  const formatted = formatter.format(ratio);
  return signed && ratio > 0 ? `+${formatted}` : formatted;
}

/** Parses date-only ISO strings (`YYYY-MM-DD`) at UTC noon to avoid timezone date shifts. */
function parseUtcDate(input: string | Date): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input);
  const date = new Date(isoDateOnly ? `${input}T12:00:00Z` : input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatUtcDate(
  input: string | Date,
  style: "long" | "short" | "monthDayLong" | "monthDayShort" = "short",
): string {
  const date = parseUtcDate(input);
  if (!date) return typeof input === "string" ? input : "";
  switch (style) {
    case "long":
      return DATE_LONG_UTC.format(date);
    case "monthDayLong":
      return DATE_MONTH_DAY_LONG_UTC.format(date);
    case "monthDayShort":
      return DATE_MONTH_DAY_SHORT_UTC.format(date);
    case "short":
    default:
      return DATE_SHORT_UTC.format(date);
  }
}
