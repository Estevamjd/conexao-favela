import { describe, expect, it } from 'vitest';
import { formatGuideLanguages, formatGuideRating } from './guide-formatters';

describe('guide formatters', () => {
  it('formats ratings with the active locale', () => {
    expect(formatGuideRating(4.9, 'pt')).toBe('4,9');
    expect(formatGuideRating(4.9, 'en')).toBe('4.9');
  });

  it('renders guide language names from supported language metadata', () => {
    expect(formatGuideLanguages(['pt', 'en', 'es'])).toBe('Português, English, Español');
  });
});
