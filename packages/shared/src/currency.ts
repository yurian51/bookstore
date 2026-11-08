/**
 * Money is stored as integer minor units (e.g. cents, or whole shillings for TZS
 * which has no minor unit in practice). Never use floats for money.
 */
export const SUPPORTED_CURRENCIES = ["TZS", "USD", "EUR", "GBP", "KES"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_META: Record<CurrencyCode, { symbol: string; minorUnits: number; name: string }> = {
  TZS: { symbol: "TSh", minorUnits: 0, name: "Tanzanian Shilling" },
  KES: { symbol: "KSh", minorUnits: 2, name: "Kenyan Shilling" },
  USD: { symbol: "$", minorUnits: 2, name: "US Dollar" },
  EUR: { symbol: "€", minorUnits: 2, name: "Euro" },
  GBP: { symbol: "£", minorUnits: 2, name: "Pound Sterling" },
};

export function isCurrency(code: string): code is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

/** Format integer minor units for display. */
export function formatMoney(amountMinor: number, currency: CurrencyCode, locale = "en"): string {
  const meta = CURRENCY_META[currency];
  const major = amountMinor / Math.pow(10, meta.minorUnits);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: meta.minorUnits,
    maximumFractionDigits: meta.minorUnits,
  }).format(major);
  return `${meta.symbol} ${formatted}`;
}

/**
 * Convert an amount between currencies using an integer basis-point rate.
 * rateBps: how many basis points of target per 1 unit of source, scaled so
 * 1.0 = 10000. Rounds half away from zero, all integer math.
 */
export function convertMinor(
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rateScaled: number, // target-minor per source-minor, scaled by 1e6
): number {
  if (from === to) return amountMinor;
  const scale = 1_000_000;
  const numerator = amountMinor * rateScaled;
  const adjusted = Math.sign(numerator) * Math.round(Math.abs(numerator) / scale);
  return adjusted;
}
