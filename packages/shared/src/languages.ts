export const SUPPORTED_LANGUAGE_CODES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'zh', 'ja'] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const MVP_LANGUAGE_CODES = [
  'pt',
  'en',
  'es',
] as const satisfies readonly SupportedLanguageCode[];

export const SUPPORTED_LANGUAGES = [
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Portugu\u00eas',
    flag: '\ud83c\udde7\ud83c\uddf7',
  },
  { code: 'en', name: 'English', nativeName: 'English', flag: '\ud83c\uddfa\ud83c\uddf8' },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00f1ol', flag: '\ud83c\uddea\ud83c\uddf8' },
  { code: 'fr', name: 'French', nativeName: 'Fran\u00e7ais', flag: '\ud83c\uddeb\ud83c\uddf7' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '\ud83c\udde9\ud83c\uddea' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '\ud83c\uddee\ud83c\uddf9' },
  { code: 'zh', name: 'Chinese', nativeName: '\u4e2d\u6587', flag: '\ud83c\udde8\ud83c\uddf3' },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '\u65e5\u672c\u8a9e',
    flag: '\ud83c\uddef\ud83c\uddf5',
  },
] as const satisfies readonly {
  readonly code: SupportedLanguageCode;
  readonly name: string;
  readonly nativeName: string;
  readonly flag: string;
}[];
