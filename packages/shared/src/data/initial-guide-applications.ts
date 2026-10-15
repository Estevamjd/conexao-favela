import type { FirestoreTimestamp, User } from '../types';
import { INITIAL_COMMUNITY_ID, INITIAL_SUB_AREA_IDS } from './initial-community';

function timestampFromIso(iso: string): FirestoreTimestamp {
  const date = new Date(iso);
  const milliseconds = date.getTime();

  return {
    nanoseconds: (milliseconds % 1000) * 1_000_000,
    seconds: Math.floor(milliseconds / 1000),
    toDate: () => date,
  };
}

export const INITIAL_GUIDE_APPLICATIONS: readonly User[] = [
  {
    id: 'guide-app-luana',
    email: 'luana.guia@example.com',
    type: 'guide',
    displayName: 'Luana Martins',
    preferredLanguage: 'pt',
    preferredCurrency: 'BRL',
    notificationsEnabled: true,
    createdAt: timestampFromIso('2026-05-20T13:00:00.000Z'),
    updatedAt: timestampFromIso('2026-05-21T16:30:00.000Z'),
    lastLoginAt: timestampFromIso('2026-05-27T18:20:00.000Z'),
    guideProfile: {
      bio: {
        pt: 'Moradora local com foco em memoria do teleferico, fotografia e turismo comunitario.',
      },
      communityId: INITIAL_COMMUNITY_ID,
      subAreaIds: [INITIAL_SUB_AREA_IDS.morroAlemao, INITIAL_SUB_AREA_IDS.morroAdeus],
      languagesSpoken: ['pt', 'en', 'es'],
      yearsOfExperience: 6,
      rating: 0,
      totalReviews: 0,
      totalToursCompleted: 0,
      verified: false,
      documents: {
        cpfHash: 'sha256:dev-luana',
        documentUrls: ['dev://guide-documents/guide-app-luana/identity.pdf'],
      },
    },
  },
  {
    id: 'guide-app-matheus',
    email: 'matheus.rotas@example.com',
    type: 'guide',
    displayName: 'Matheus Souza',
    preferredLanguage: 'pt',
    preferredCurrency: 'BRL',
    notificationsEnabled: true,
    createdAt: timestampFromIso('2026-05-18T12:00:00.000Z'),
    updatedAt: timestampFromIso('2026-05-22T11:00:00.000Z'),
    lastLoginAt: timestampFromIso('2026-05-26T20:10:00.000Z'),
    guideProfile: {
      bio: {
        pt: 'Guia de trilhas leves, mirantes e historias da Serra da Misericordia.',
      },
      communityId: INITIAL_COMMUNITY_ID,
      subAreaIds: [INITIAL_SUB_AREA_IDS.morroAlemao],
      languagesSpoken: ['pt'],
      yearsOfExperience: 4,
      rating: 0,
      totalReviews: 0,
      totalToursCompleted: 0,
      verified: false,
      documents: {
        cpfHash: 'sha256:dev-matheus',
        documentUrls: ['dev://guide-documents/guide-app-matheus/address.pdf'],
      },
    },
  },
  {
    id: 'guide-app-carolina',
    email: 'carolina.arte@example.com',
    type: 'guide',
    displayName: 'Carolina Nascimento',
    preferredLanguage: 'pt',
    preferredCurrency: 'BRL',
    notificationsEnabled: false,
    createdAt: timestampFromIso('2026-05-16T14:00:00.000Z'),
    updatedAt: timestampFromIso('2026-05-19T17:45:00.000Z'),
    lastLoginAt: timestampFromIso('2026-05-25T15:00:00.000Z'),
    guideProfile: {
      bio: {
        pt: 'Educadora cultural com roteiros de arte urbana, becos coloridos e gastronomia local.',
      },
      communityId: INITIAL_COMMUNITY_ID,
      subAreaIds: [INITIAL_SUB_AREA_IDS.morroAdeus],
      languagesSpoken: ['pt', 'fr'],
      yearsOfExperience: 5,
      rating: 0,
      totalReviews: 0,
      totalToursCompleted: 0,
      verified: false,
      documents: {
        cpfHash: 'sha256:dev-carolina',
        documentUrls: ['dev://guide-documents/guide-app-carolina/identity.pdf'],
      },
    },
  },
];
