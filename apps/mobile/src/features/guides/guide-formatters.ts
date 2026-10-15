import {
  SUPPORTED_LANGUAGES,
  type PublicGuide,
  type SupportedLanguageCode,
} from '@conexao-favela/shared';

const localeByLanguage: Record<SupportedLanguageCode, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

export function formatGuideRating(
  rating: PublicGuide['rating'],
  language: SupportedLanguageCode,
): string {
  return new Intl.NumberFormat(localeByLanguage[language], {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(rating);
}

export function formatGuideLanguages(languages: PublicGuide['languagesSpoken']): string {
  return languages
    .map(
      (language) =>
        SUPPORTED_LANGUAGES.find((supportedLanguage) => supportedLanguage.code === language)
          ?.nativeName ?? language.toUpperCase(),
    )
    .join(', ');
}
