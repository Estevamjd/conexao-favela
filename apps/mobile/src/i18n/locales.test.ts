import { describe, expect, it } from 'vitest';

import { resources } from './resources';

const corruptedCopyPattern = /\?{2,}|\uFFFD|\u00C2|\u00EF\u00BF\u00BD|\u00C3\u0082/;

type LocaleCode = keyof typeof resources;
type NamespaceName = keyof (typeof resources)['en'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenKeys(value: unknown, prefix = ''): readonly string[] {
  if (!isRecord(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    flattenKeys(nestedValue, prefix ? `${prefix}.${key}` : key),
  );
}

function collectStrings(value: unknown): readonly string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item: unknown) => collectStrings(item));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => collectStrings(item));
  }

  return [];
}

function localeCodes(): readonly LocaleCode[] {
  return (Object.keys(resources) as LocaleCode[]).sort();
}

function namespaceNames(locale: LocaleCode): readonly NamespaceName[] {
  return (Object.keys(resources[locale]) as NamespaceName[]).sort();
}

function namespaceResource(locale: LocaleCode, namespace: NamespaceName): unknown {
  return (resources[locale] as Record<NamespaceName, unknown>)[namespace];
}

describe('i18n locale resources', () => {
  it('keeps every locale aligned with the English namespace keys', () => {
    const englishNamespaces = namespaceNames('en');

    for (const locale of localeCodes()) {
      expect(namespaceNames(locale), `${locale} namespaces`).toEqual(englishNamespaces);

      for (const namespaceName of englishNamespaces) {
        const englishKeys = [...flattenKeys(namespaceResource('en', namespaceName))].sort();
        const localeKeys = [...flattenKeys(namespaceResource(locale, namespaceName))].sort();

        expect(localeKeys, `${locale}/${namespaceName}`).toEqual(englishKeys);
      }
    }
  });

  it('does not ship corrupted placeholder copy in locale strings', () => {
    const failures: string[] = [];

    for (const locale of localeCodes()) {
      for (const namespaceName of namespaceNames(locale)) {
        const strings = collectStrings(namespaceResource(locale, namespaceName));
        const corruptedValues = strings.filter((value) => corruptedCopyPattern.test(value));

        if (corruptedValues.length > 0) {
          failures.push(`${locale}/${namespaceName}: ${corruptedValues.join(' | ')}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
