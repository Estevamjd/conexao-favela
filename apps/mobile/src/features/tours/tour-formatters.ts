import type {
  SupportedLanguageCode,
  Tour,
  TourCategory,
  TourDifficulty,
} from '@conexao-favela/shared';
import { resolveLocalizedText, type DraftLocalizedText } from '@conexao-favela/shared';

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

const categoryLabels: Record<TourCategory, DraftLocalizedText> = {
  arte: { pt: 'Arte', en: 'Art', es: 'Arte' },
  cultural: { pt: 'Cultural', en: 'Cultural', es: 'Cultural' },
  fotografico: { pt: 'Fotográfico', en: 'Photo route', es: 'Fotográfico' },
  gastronomico: { pt: 'Gastronômico', en: 'Food', es: 'Gastronómico' },
  historico: { pt: 'Histórico', en: 'History', es: 'Histórico' },
  natureza: { pt: 'Natureza', en: 'Nature', es: 'Naturaleza' },
};

const difficultyLabels: Record<TourDifficulty, DraftLocalizedText> = {
  easy: { pt: 'Leve', en: 'Easy', es: 'Ligero' },
  hard: { pt: 'Intenso', en: 'Hard', es: 'Intenso' },
  moderate: { pt: 'Moderado', en: 'Moderate', es: 'Moderado' },
};

export function formatTourPrice(tour: Tour, language: SupportedLanguageCode): string {
  if (tour.pricing.type === 'free') {
    return resolveLocalizedText({ pt: 'Grátis', en: 'Free', es: 'Gratis' }, language);
  }

  const formatter = new Intl.NumberFormat(localeByLanguage[language], {
    currency: tour.pricing.currency,
    maximumFractionDigits: 0,
    style: 'currency',
  });

  if (tour.pricing.minPrice === tour.pricing.maxPrice) {
    return formatter.format(tour.pricing.minPrice);
  }

  return `${formatter.format(tour.pricing.minPrice)} - ${formatter.format(tour.pricing.maxPrice)}`;
}

export function formatTourDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${String(remainingMinutes)}min`;
  }

  if (remainingMinutes === 0) {
    return `${String(hours)}h`;
  }

  return `${String(hours)}h ${String(remainingMinutes)}min`;
}

export function formatTourDistance(meters: number, language: SupportedLanguageCode): string {
  const formatter = new Intl.NumberFormat(localeByLanguage[language], {
    maximumFractionDigits: 1,
  });

  return `${formatter.format(meters / 1000)} km`;
}

export function formatTourCategory(
  category: TourCategory,
  language: SupportedLanguageCode,
): string {
  return resolveLocalizedText(categoryLabels[category], language);
}

export function formatTourDifficulty(
  difficulty: TourDifficulty,
  language: SupportedLanguageCode,
): string {
  return resolveLocalizedText(difficultyLabels[difficulty], language);
}
