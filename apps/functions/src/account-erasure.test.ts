import { describe, expect, it } from 'vitest';
import {
  AccountErasurePlanError,
  buildAccountErasurePlan,
  extractPrivateStoragePath,
  parseAccountErasureRequest,
  type FunctionUserForErasure,
} from './account-erasure.js';

const guideUser: FunctionUserForErasure = {
  guideProfile: {
    communityId: 'alemao',
    documents: {
      documentUrls: [
        'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/guide-documents%2Fguide-1%2Frg.pdf?alt=media',
        'gs://project.appspot.com/guide-documents/guide-1/address.pdf',
        'https://example.com/public-image.jpg',
      ],
    },
    languagesSpoken: ['pt', 'en'],
    rating: 4.8,
    subAreaIds: ['morro-alemao'],
    totalReviews: 12,
    totalToursCompleted: 34,
    verified: true,
    yearsOfExperience: 6,
  },
  id: 'guide-1',
  type: 'guide',
};

describe('account erasure planning', () => {
  it('requires an explicit confirmation payload', () => {
    expect(parseAccountErasureRequest({ confirmation: 'DELETE_MY_ACCOUNT' })).toEqual({
      confirmation: 'DELETE_MY_ACCOUNT',
    });
    expect(() => parseAccountErasureRequest({ confirmation: 'delete' })).toThrow(
      AccountErasurePlanError,
    );
    expect(() =>
      parseAccountErasureRequest({ confirmation: 'DELETE_MY_ACCOUNT', userId: 'other' }),
    ).toThrow(AccountErasurePlanError);
  });

  it('extracts only private guide document paths from supported Storage URL formats', () => {
    expect(
      extractPrivateStoragePath(
        'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/guide-documents%2Fguide-1%2Frg.pdf?alt=media',
      ),
    ).toBe('guide-documents/guide-1/rg.pdf');
    expect(
      extractPrivateStoragePath('gs://project.appspot.com/guide-documents/guide-1/rg.pdf'),
    ).toBe('guide-documents/guide-1/rg.pdf');
    expect(extractPrivateStoragePath('tour-media/guide-1/photo.jpg')).toBeNull();
  });

  it('builds an anonymization patch, audit log, and private document deletion plan', () => {
    const plan = buildAccountErasurePlan(guideUser, {
      auditLogId: 'audit-erasure-1',
      erasedAt: new Date('2026-05-31T12:00:00.000Z'),
    });

    expect(plan.userPatch.email).toBe('deleted-audit-erasure-1@privacy.conexaofavela.local');
    expect(plan.userPatch.displayName).toBe('Conta excluida');
    expect(plan.userPatch.guideProfile?.verified).toBe(false);
    expect(plan.userPatch.guideProfile?.documents).toEqual({
      cpfHash: 'erased',
      documentUrls: [],
    });
    expect(plan.privateStoragePaths).toEqual([
      'guide-documents/guide-1/rg.pdf',
      'guide-documents/guide-1/address.pdf',
    ]);
    expect(plan.auditLog.action).toBe('account_erased');
    expect(plan.auditLog.metadata.documentCount).toBe(3);
  });

  it('blocks admin self-erasure from the public callable', () => {
    expect(() =>
      buildAccountErasurePlan(
        {
          id: 'admin-1',
          type: 'admin',
        },
        { auditLogId: 'audit-erasure-admin' },
      ),
    ).toThrow(AccountErasurePlanError);
  });
});
