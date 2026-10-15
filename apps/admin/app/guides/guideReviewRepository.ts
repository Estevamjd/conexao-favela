import { FIRESTORE_COLLECTIONS } from '@conexao-favela/firebase-config';
import {
  SUPPORTED_LANGUAGE_CODES,
  guideApprovalRequestSchema,
  type AuditLog,
  type AuditLogMetadata,
  type CurrencyCode,
  type DraftLocalizedText,
  type FirestoreTimestamp,
  type SupportedLanguageCode,
  type User,
} from '@conexao-favela/shared';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';

type GuideApprovalCallableResponse = {
  readonly alreadyApproved: boolean;
  readonly approved: boolean;
  readonly auditAction?: 'guide_approved';
  readonly communityId?: string;
  readonly guideId: string;
  readonly verifiedAtIso?: string;
};

type GuideReviewRepositoryServices = {
  readonly db: Firestore;
  readonly functions: Functions;
};

type GuideReviewRepositoryOptions = {
  readonly communityId: string;
};

export type GuideReviewRepository = {
  readonly approveGuide: (guideId: string) => Promise<void>;
  readonly subscribeToAuditLogs: (
    onNext: (auditLogs: readonly AuditLog[]) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe;
  readonly subscribeToGuideApplications: (
    onNext: (applications: readonly User[]) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function isTimestampLike(value: unknown): value is FirestoreTimestamp {
  return (
    isRecord(value) &&
    typeof value.seconds === 'number' &&
    typeof value.nanoseconds === 'number' &&
    typeof value.toDate === 'function'
  );
}

function fallbackTimestamp(): FirestoreTimestamp {
  const date = new Date(0);

  return {
    nanoseconds: 0,
    seconds: 0,
    toDate: () => date,
  };
}

function readTimestamp(value: unknown): FirestoreTimestamp {
  return isTimestampLike(value) ? value : fallbackTimestamp();
}

function readOptionalTimestamp(value: unknown): FirestoreTimestamp | undefined {
  return isTimestampLike(value) ? value : undefined;
}

function isSupportedLanguageCode(value: unknown): value is SupportedLanguageCode {
  return (
    typeof value === 'string' && SUPPORTED_LANGUAGE_CODES.includes(value as SupportedLanguageCode)
  );
}

function readLanguageCode(value: unknown): SupportedLanguageCode {
  return isSupportedLanguageCode(value) ? value : 'pt';
}

function readLanguageCodes(value: unknown): readonly SupportedLanguageCode[] {
  if (!Array.isArray(value)) {
    return ['pt'];
  }

  const languages = value.filter(isSupportedLanguageCode);

  return languages.length > 0 ? languages : ['pt'];
}

function readCurrency(value: unknown): CurrencyCode {
  return value === 'USD' || value === 'EUR' || value === 'BRL' ? value : 'BRL';
}

function readDraftLocalizedText(value: unknown): DraftLocalizedText {
  if (!isRecord(value) || typeof value.pt !== 'string' || value.pt.trim().length === 0) {
    return { pt: 'Bio pendente de revisao no painel admin.' };
  }

  return {
    de: typeof value.de === 'string' ? value.de : undefined,
    en: typeof value.en === 'string' ? value.en : undefined,
    es: typeof value.es === 'string' ? value.es : undefined,
    fr: typeof value.fr === 'string' ? value.fr : undefined,
    it: typeof value.it === 'string' ? value.it : undefined,
    ja: typeof value.ja === 'string' ? value.ja : undefined,
    pt: value.pt,
    zh: typeof value.zh === 'string' ? value.zh : undefined,
  };
}

function readAuditMetadata(value: unknown): AuditLogMetadata {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<AuditLogMetadata>((metadata, [key, metadataValue]) => {
    if (
      typeof metadataValue === 'string' ||
      typeof metadataValue === 'number' ||
      typeof metadataValue === 'boolean' ||
      metadataValue === null
    ) {
      return {
        ...metadata,
        [key]: metadataValue,
      };
    }

    return metadata;
  }, {});
}

export function mapGuideApplicationDocument(id: string, data: DocumentData): User | null {
  const record = data as Readonly<Record<string, unknown>>;
  const guideProfile = isRecord(record.guideProfile) ? record.guideProfile : null;

  if (record.type !== 'guide' || !guideProfile) {
    return null;
  }

  const documents = isRecord(guideProfile.documents) ? guideProfile.documents : {};

  return {
    createdAt: readTimestamp(record.createdAt),
    displayName: readString(record.displayName, 'Guia sem nome'),
    email: readString(record.email),
    guideProfile: {
      bio: readDraftLocalizedText(guideProfile.bio),
      communityId: readString(guideProfile.communityId),
      documents: {
        cpfHash: readString(documents.cpfHash, 'restricted'),
        documentUrls: readStringArray(documents.documentUrls),
      },
      languagesSpoken: readLanguageCodes(guideProfile.languagesSpoken),
      rating: readNumber(guideProfile.rating),
      subAreaIds: readStringArray(guideProfile.subAreaIds),
      totalReviews: readNumber(guideProfile.totalReviews),
      totalToursCompleted: readNumber(guideProfile.totalToursCompleted),
      verified: readBoolean(guideProfile.verified),
      verifiedAt: readOptionalTimestamp(guideProfile.verifiedAt),
      yearsOfExperience: readNumber(guideProfile.yearsOfExperience),
    },
    id,
    lastLoginAt: readTimestamp(record.lastLoginAt),
    notificationsEnabled: readBoolean(record.notificationsEnabled, true),
    photoUrl: typeof record.photoUrl === 'string' ? record.photoUrl : undefined,
    phone: typeof record.phone === 'string' ? record.phone : undefined,
    preferredCurrency: readCurrency(record.preferredCurrency),
    preferredLanguage: readLanguageCode(record.preferredLanguage),
    type: 'guide',
    updatedAt: readTimestamp(record.updatedAt),
  };
}

export function mapAuditLogDocument(id: string, data: DocumentData): AuditLog | null {
  const record = data as Readonly<Record<string, unknown>>;

  if (record.action !== 'guide_approved' && record.action !== 'account_erased') {
    return null;
  }

  return {
    action: record.action,
    actorId: readString(record.actorId, 'unknown-admin'),
    communityId: typeof record.communityId === 'string' ? record.communityId : undefined,
    createdAt: readTimestamp(record.createdAt),
    id,
    metadata: readAuditMetadata(record.metadata),
    targetUserId: readString(record.targetUserId, 'unknown-guide'),
  };
}

export function sortGuideApplications(applications: readonly User[]): readonly User[] {
  return [...applications].sort((left, right) => {
    const verificationDelta =
      Number(left.guideProfile?.verified ?? false) - Number(right.guideProfile?.verified ?? false);

    if (verificationDelta !== 0) {
      return verificationDelta;
    }

    return right.updatedAt.toDate().getTime() - left.updatedAt.toDate().getTime();
  });
}

export function filterGuideApplicationsByCommunity(
  applications: readonly User[],
  communityId: string,
): readonly User[] {
  return applications.filter(
    (application) => application.guideProfile?.communityId === communityId,
  );
}

export function filterAuditLogsByCommunity(
  auditLogs: readonly AuditLog[],
  communityId: string,
): readonly AuditLog[] {
  return auditLogs.filter((auditLog) => auditLog.communityId === communityId);
}

export function createFirebaseGuideReviewRepository(
  services: GuideReviewRepositoryServices,
  options: GuideReviewRepositoryOptions,
): GuideReviewRepository {
  return {
    async approveGuide(guideId) {
      const input = guideApprovalRequestSchema.parse({ guideId });
      const approveGuideCallable = httpsCallable<typeof input, GuideApprovalCallableResponse>(
        services.functions,
        'approveGuide',
      );

      await approveGuideCallable(input);
    },
    subscribeToAuditLogs(onNext, onError) {
      const auditQuery = query(
        collection(services.db, FIRESTORE_COLLECTIONS.auditLogs),
        where('communityId', '==', options.communityId),
        orderBy('createdAt', 'desc'),
        limit(20),
      );

      return onSnapshot(
        auditQuery,
        (snapshot) => {
          const auditLogs = snapshot.docs
            .map((document) => mapAuditLogDocument(document.id, document.data()))
            .filter((auditLog): auditLog is AuditLog => auditLog !== null);

          onNext(filterAuditLogsByCommunity(auditLogs, options.communityId));
        },
        onError,
      );
    },
    subscribeToGuideApplications(onNext, onError) {
      // The admin client reads only guide documents. Approval itself still goes through
      // the callable so the browser never writes privileged verification fields.
      const guidesQuery = query(
        collection(services.db, FIRESTORE_COLLECTIONS.users),
        where('type', '==', 'guide'),
        where('guideProfile.communityId', '==', options.communityId),
        limit(50),
      );

      return onSnapshot(
        guidesQuery,
        (snapshot) => {
          const applications = snapshot.docs
            .map((document) => mapGuideApplicationDocument(document.id, document.data()))
            .filter((application): application is User => application !== null);

          onNext(
            sortGuideApplications(
              filterGuideApplicationsByCommunity(applications, options.communityId),
            ),
          );
        },
        onError,
      );
    },
  };
}
