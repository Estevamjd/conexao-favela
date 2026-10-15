import type { DraftLocalizedText, LocalizedText } from '../types';
import type { SupportedLanguageCode } from '../languages';

const FALLBACK_LANGUAGE: SupportedLanguageCode = 'pt';

export function resolveLocalizedText(
  value: LocalizedText | DraftLocalizedText,
  preferredLanguage: SupportedLanguageCode,
): string {
  const preferred = value[preferredLanguage];

  // Guides may draft only MVP languages at first; Portuguese remains the contractual fallback.
  if (typeof preferred === 'string' && preferred.trim().length > 0) {
    return preferred;
  }

  const fallback = value[FALLBACK_LANGUAGE];

  if (typeof fallback === 'string') {
    return fallback;
  }

  return '';
}
