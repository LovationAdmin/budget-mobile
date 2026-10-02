// src/lib/budget/format.ts
// Money formatting shared by the budget screens.

export function currencySymbol(code?: string): string {
  switch ((code || 'EUR').toUpperCase()) {
    case 'USD':
    case 'CAD':
    case 'AUD':
      return '$';
    case 'GBP':
      return '£';
    case 'CHF':
      return 'CHF';
    case 'XOF':
    case 'XAF':
      return 'CFA';
    case 'MAD':
      return 'DH';
    default:
      return '€';
  }
}

const NBSP = ' ';
const MINUS = '−';

const formatters = new Map<number, Intl.NumberFormat>();
function nf(decimals: number): Intl.NumberFormat {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    formatters.set(decimals, f);
  }
  return f;
}

/** Rounds to cents to avoid floating noise (0.1 + 0.2). */
export const roundCents = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

function decimalsFor(n: number, whole: boolean): number {
  if (whole) return 0;
  return Math.abs(roundCents(n) % 1) > 0.004 ? 2 : 0;
}

/** "1 180 €" (cents shown only when present, unless `whole`). */
export function money(n: number, symbol = '€', whole = false): string {
  const v = roundCents(n);
  return `${nf(decimalsFor(v, whole)).format(Math.abs(v) < 0.005 ? 0 : v).replace('-', MINUS)}${NBSP}${symbol}`;
}

/** "+30 €" / "−240 €" / "0 €" */
export function moneySigned(n: number, symbol = '€', whole = false): string {
  const v = roundCents(n);
  if (Math.abs(v) < 0.005) return `0${NBSP}${symbol}`;
  const abs = nf(decimalsFor(v, whole)).format(Math.abs(v));
  return `${v > 0 ? '+' : MINUS}${abs}${NBSP}${symbol}`;
}

/** Outflow display: "−2 446 €" for a positive amount. */
export function moneyOut(n: number, symbol = '€', whole = false): string {
  const v = roundCents(n);
  if (Math.abs(v) < 0.005) return `0${NBSP}${symbol}`;
  return `${v > 0 ? MINUS : '+'}${nf(decimalsFor(v, whole)).format(Math.abs(v))}${NBSP}${symbol}`;
}

export function percent(n: number): string {
  return `${Math.round(n)}${NBSP}%`;
}

/** Parses user input like "1 250,50" or "1250.5". Returns NaN when invalid. */
export function parseAmount(input: string | number): number {
  if (typeof input === 'number') return input;
  const cleaned = String(input).replace(/[\s  €]/g, '').replace(',', '.');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
