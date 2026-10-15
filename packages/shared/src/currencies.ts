import type { CurrencyCode } from './types';

export const SUPPORTED_CURRENCY_CODES = [
  'BRL',
  'USD',
  'EUR',
] as const satisfies readonly CurrencyCode[];

export const SUPPORTED_CURRENCIES = [
  { code: 'BRL', label: 'BRL' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
] as const satisfies readonly {
  readonly code: CurrencyCode;
  readonly label: string;
}[];
