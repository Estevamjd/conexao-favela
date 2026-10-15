import { describe, expect, it } from 'vitest';
import {
  buildGuideDocumentStoragePath,
  resolveGuideDocumentContentType,
  sanitizeGuideDocumentFileName,
} from './guide-document-upload';

describe('guide document upload helpers', () => {
  it('builds restricted Storage paths instead of public download URLs', () => {
    expect(
      buildGuideDocumentStoragePath({
        fileName: 'RG frente.pdf',
        guideId: 'guide-1',
        index: 0,
        uploadedAtMs: 1_780_000_000_000,
      }),
    ).toBe('guide-documents/guide-1/1780000000000-0-RG-frente.pdf');
  });

  it('sanitizes unsafe file names', () => {
    expect(sanitizeGuideDocumentFileName('../../cpf com espaco.png')).toBe(
      '..-..-cpf-com-espaco.png',
    );
    expect(sanitizeGuideDocumentFileName('   ')).toBe('document');
  });

  it('accepts only document content types allowed by Storage rules', () => {
    expect(resolveGuideDocumentContentType({ mimeType: 'application/pdf', name: 'doc.bin' })).toBe(
      'application/pdf',
    );
    expect(resolveGuideDocumentContentType({ mimeType: undefined, name: 'selfie.webp' })).toBe(
      'image/webp',
    );
    expect(() =>
      resolveGuideDocumentContentType({ mimeType: 'text/plain', name: 'notes.txt' }),
    ).toThrow('Documento deve ser PDF, JPG, PNG ou WEBP.');
  });
});
