export type CurrencyCode = "GBP" | "EUR" | "TRY";

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; symbol: string }> = {
  GBP: { locale: "en-GB", symbol: "£" },
  EUR: { locale: "de-DE", symbol: "€" },
  TRY: { locale: "tr-TR", symbol: "₺" },
};

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "GBP",
  decimals = 2
): string {
  const n = amount ?? 0;
  const cfg = CURRENCY_CONFIG[(currency as CurrencyCode)] ?? CURRENCY_CONFIG.GBP;
  return n.toLocaleString(cfg.locale, {
    style: "currency",
    currency: currency as CurrencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function currencySymbol(currency: string = "GBP"): string {
  return CURRENCY_CONFIG[(currency as CurrencyCode)]?.symbol ?? "£";
}

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string; symbol: string }[] = [
  { value: "GBP", label: "Pound Sterling (£)", symbol: "£" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "TRY", label: "Turkish Lira (₺)", symbol: "₺" },
];
