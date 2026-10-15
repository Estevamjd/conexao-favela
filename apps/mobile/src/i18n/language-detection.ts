import { getLocales } from 'expo-localization';
import { SUPPORTED_LANGUAGE_CODES, type SupportedLanguageCode } from '@conexao-favela/shared';

export function detectInitialLanguage(): SupportedLanguageCode {
  const languageCode = getLocales()[0].languageCode;

  if (SUPPORTED_LANGUAGE_CODES.some((code) => code === languageCode)) {
    return languageCode as SupportedLanguageCode;
  }

  return 'pt';
}
