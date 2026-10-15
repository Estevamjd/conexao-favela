import type { LocalizedText } from '../types';

export function localizedText(
  pt: string,
  en: string,
  es: string,
  fr: string,
  de: string,
  it: string,
  zh: string,
  ja: string,
): LocalizedText {
  return { pt, en, es, fr, de, it, zh, ja };
}
