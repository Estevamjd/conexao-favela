import { SUPPORTED_LANGUAGE_CODES, type SupportedLanguageCode } from '@conexao-favela/shared';
import { useTranslation } from 'react-i18next';

export function useCurrentLanguage(): SupportedLanguageCode {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const normalizedLanguage = language.split('-')[0];

  if (SUPPORTED_LANGUAGE_CODES.some((code) => code === normalizedLanguage)) {
    return normalizedLanguage as SupportedLanguageCode;
  }

  return 'pt';
}
