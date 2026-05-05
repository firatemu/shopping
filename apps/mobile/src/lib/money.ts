export function toCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const normalized = typeof value === 'string' ? value.replace(',', '.') : value;
  const numeric = typeof normalized === 'number' ? normalized : Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

export function centsToNumber(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatCurrencyFromCents(cents: number): string {
  return new Intl.NumberFormat('tr-TR', {
    currency: 'TRY',
    style: 'currency',
  }).format(centsToNumber(cents));
}

export function formatCurrency(value: number | string | null | undefined): string {
  return formatCurrencyFromCents(toCents(value));
}
