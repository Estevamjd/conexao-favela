import { describe, expect, it } from 'vitest';
import {
  filterAuditLogsByCommunity,
  filterGuideApplicationsByCommunity,
  mapAuditLogDocument,
  mapGuideApplicationDocument,
  sortGuideApplications,
} from './guideReviewRepository';
import type { AuditLog, User } from '@conexao-favela/shared';

function timestamp(iso: string) {
  const date = new Date(iso);
  const milliseconds = date.getTime();

  return {
    nanoseconds: (milliseconds % 1000) * 1_000_000,
    seconds: Math.floor(milliseconds / 1000),
    toDate: () => date,
  };
}

function isUser(value: User | null): value is User {
  return value !== null;
}

function isAuditLog(value: AuditLog | null): value is AuditLog {
  return value !== null;
}

describe('guideReviewRepository', () => {
  it('maps Firestore guide documents into the shared User contract', () => {
    const guide = mapGuideApplicationDocument('guide-real-1', {
      createdAt: timestamp('2026-05-20T10:00:00.000Z'),
      displayName: 'Guia Real',
      email: 'guia@example.com',
      guideProfile: {
        bio: { pt: 'Guia local verificado pela comunidade.' },
        communityId: 'alemao',
        documents: {
          cpfHash: 'encrypted-or-hash',
          documentUrls: ['gs://restricted/document.pdf'],
        },
        languagesSpoken: ['pt', 'en', 'unknown'],
        rating: 0,
        subAreaIds: ['morro-alemao'],
        totalReviews: 0,
        totalToursCompleted: 0,
        verified: false,
        yearsOfExperience: 3,
      },
      lastLoginAt: timestamp('2026-05-22T10:00:00.000Z'),
      notificationsEnabled: true,
      preferredCurrency: 'BRL',
      preferredLanguage: 'pt',
      type: 'guide',
      updatedAt: timestamp('2026-05-23T10:00:00.000Z'),
    });

    expect(guide?.id).toBe('guide-real-1');
    expect(guide?.guideProfile?.communityId).toBe('alemao');
    expect(guide?.guideProfile?.languagesSpoken).toEqual(['pt', 'en']);
  });

  it('ignores non-guide user documents', () => {
    const mapped = mapGuideApplicationDocument('tourist-1', {
      guideProfile: null,
      type: 'tourist',
    });

    expect(mapped).toBeNull();
  });

  it('sorts pending guides before approved guides by recency', () => {
    const olderPending = mapGuideApplicationDocument('older', {
      createdAt: timestamp('2026-05-20T10:00:00.000Z'),
      guideProfile: {
        bio: { pt: 'Guia pendente.' },
        communityId: 'alemao',
        documents: { cpfHash: 'hash', documentUrls: ['doc'] },
        languagesSpoken: ['pt'],
        subAreaIds: ['morro-alemao'],
        verified: false,
      },
      type: 'guide',
      updatedAt: timestamp('2026-05-20T10:00:00.000Z'),
    });
    const newerPending = mapGuideApplicationDocument('newer', {
      createdAt: timestamp('2026-05-21T10:00:00.000Z'),
      guideProfile: {
        bio: { pt: 'Guia pendente mais recente.' },
        communityId: 'alemao',
        documents: { cpfHash: 'hash', documentUrls: ['doc'] },
        languagesSpoken: ['pt'],
        subAreaIds: ['morro-adeus'],
        verified: false,
      },
      type: 'guide',
      updatedAt: timestamp('2026-05-21T10:00:00.000Z'),
    });
    const approved = mapGuideApplicationDocument('approved', {
      createdAt: timestamp('2026-05-22T10:00:00.000Z'),
      guideProfile: {
        bio: { pt: 'Guia aprovado.' },
        communityId: 'alemao',
        documents: { cpfHash: 'hash', documentUrls: ['doc'] },
        languagesSpoken: ['pt'],
        subAreaIds: ['morro-alemao'],
        verified: true,
      },
      type: 'guide',
      updatedAt: timestamp('2026-05-22T10:00:00.000Z'),
    });

    expect(sortGuideApplications([approved, olderPending, newerPending].filter(isUser))).toEqual([
      newerPending,
      olderPending,
      approved,
    ]);
  });

  it('filters guide applications by community id before rendering the admin queue', () => {
    const alemaoGuide = mapGuideApplicationDocument('alemao-guide', {
      createdAt: timestamp('2026-05-20T10:00:00.000Z'),
      guideProfile: {
        bio: { pt: 'Guia da comunidade inicial.' },
        communityId: 'alemao',
        documents: { cpfHash: 'hash', documentUrls: ['doc'] },
        languagesSpoken: ['pt'],
        subAreaIds: ['morro-alemao'],
        verified: false,
      },
      type: 'guide',
      updatedAt: timestamp('2026-05-20T10:00:00.000Z'),
    });
    const mareGuide = mapGuideApplicationDocument('mare-guide', {
      createdAt: timestamp('2026-05-21T10:00:00.000Z'),
      guideProfile: {
        bio: { pt: 'Guia de expansao futura.' },
        communityId: 'mare',
        documents: { cpfHash: 'hash', documentUrls: ['doc'] },
        languagesSpoken: ['pt'],
        subAreaIds: ['subarea-mare'],
        verified: false,
      },
      type: 'guide',
      updatedAt: timestamp('2026-05-21T10:00:00.000Z'),
    });

    expect(
      filterGuideApplicationsByCommunity([alemaoGuide, mareGuide].filter(isUser), 'alemao'),
    ).toEqual([alemaoGuide]);
  });

  it('maps audit logs without leaking nested metadata', () => {
    const auditLog = mapAuditLogDocument('audit-1', {
      action: 'account_erased',
      actorId: 'admin-1',
      communityId: 'alemao',
      createdAt: timestamp('2026-05-24T10:00:00.000Z'),
      metadata: {
        documentCount: 2,
        nested: { private: true },
        previousVerified: false,
        source: 'cloud_function',
      },
      targetUserId: 'guide-real-1',
    });

    expect(auditLog?.action).toBe('account_erased');
    expect(auditLog?.metadata).toEqual({
      documentCount: 2,
      previousVerified: false,
      source: 'cloud_function',
    });
  });

  it('filters audit logs by community id', () => {
    const alemaoAudit = mapAuditLogDocument('audit-alemao', {
      action: 'guide_approved',
      actorId: 'admin-1',
      communityId: 'alemao',
      createdAt: timestamp('2026-05-24T10:00:00.000Z'),
      metadata: { source: 'cloud_function' },
      targetUserId: 'guide-real-1',
    });
    const mareAudit = mapAuditLogDocument('audit-mare', {
      action: 'guide_approved',
      actorId: 'admin-1',
      communityId: 'mare',
      createdAt: timestamp('2026-05-25T10:00:00.000Z'),
      metadata: { source: 'cloud_function' },
      targetUserId: 'guide-real-2',
    });

    const filtered = filterAuditLogsByCommunity(
      [alemaoAudit, mareAudit].filter(isAuditLog),
      'alemao',
    );

    expect(filtered).toEqual([alemaoAudit]);
  });
});
