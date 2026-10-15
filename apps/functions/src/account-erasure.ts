export const ACCOUNT_ERASURE_CONFIRMATION = 'DELETE_MY_ACCOUNT';

type FunctionGuideProfileForErasure = {
  readonly communityId: string;
  readonly documents: {
    readonly documentUrls: readonly string[];
  };
  readonly languagesSpoken: readonly string[];
  readonly rating: number;
  readonly subAreaIds: readonly string[];
  readonly totalReviews: number;
  readonly totalToursCompleted: number;
  readonly verified: boolean;
  readonly yearsOfExperience: number;
};

export type FunctionUserForErasure = {
  readonly guideProfile?: FunctionGuideProfileForErasure;
  readonly id: string;
  readonly type: 'tourist' | 'guide' | 'admin';
};

export type AccountErasureRequestInput = {
  readonly confirmation: typeof ACCOUNT_ERASURE_CONFIRMATION;
};

export type AccountErasureAuditLog = {
  readonly action: 'account_erased';
  readonly actorId: string;
  readonly createdAt: Date;
  readonly id: string;
  readonly metadata: {
    readonly documentCount: number;
    readonly privateStoragePathCount: number;
    readonly source: 'cloud_function';
    readonly userType: FunctionUserForErasure['type'];
  };
  readonly targetUserId: string;
};

export type AccountErasurePlan = {
  readonly auditLog: AccountErasureAuditLog;
  readonly deleteFieldPaths: readonly string[];
  readonly erasedAt: Date;
  readonly privateStoragePaths: readonly string[];
  readonly response: AccountErasureResponse;
  readonly userPatch: {
    readonly displayName: string;
    readonly email: string;
    readonly guideProfile?: {
      readonly bio: { readonly pt: string };
      readonly communityId: string;
      readonly documents: {
        readonly cpfHash: 'erased';
        readonly documentUrls: readonly [];
      };
      readonly languagesSpoken: readonly string[];
      readonly rating: number;
      readonly subAreaIds: readonly string[];
      readonly totalReviews: number;
      readonly totalToursCompleted: number;
      readonly verified: false;
      readonly yearsOfExperience: number;
    };
    readonly notificationsEnabled: false;
    readonly privacy: {
      readonly anonymizedAt: Date;
      readonly erasureRequestedAt: Date;
      readonly status: 'erased';
    };
  };
};

export type AccountErasureResponse = {
  readonly anonymized: true;
  readonly auditAction: AccountErasureAuditLog['action'];
  readonly privateStoragePathCount: number;
  readonly userId: string;
};

export class AccountErasurePlanError extends Error {
  constructor(
    readonly code: 'invalid_payload' | 'invalid_user',
    message: string,
  ) {
    super(message);
    this.name = 'AccountErasurePlanError';
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

export function parseAccountErasureRequest(data: unknown): AccountErasureRequestInput {
  if (!isRecord(data) || data.confirmation !== ACCOUNT_ERASURE_CONFIRMATION) {
    throw new AccountErasurePlanError('invalid_payload', 'Explicit erasure confirmation required.');
  }

  const keys = Object.keys(data);

  if (keys.some((key) => key !== 'confirmation')) {
    throw new AccountErasurePlanError('invalid_payload', 'Invalid account erasure payload.');
  }

  return { confirmation: ACCOUNT_ERASURE_CONFIRMATION };
}

export function extractPrivateStoragePath(url: string): string | null {
  if (url.startsWith('guide-documents/')) {
    return url;
  }

  if (url.startsWith('gs://')) {
    const [, path] = url.replace('gs://', '').split(/\/(.+)/, 2);
    return path?.startsWith('guide-documents/') ? path : null;
  }

  const encodedPath = /\/o\/([^?]+)/.exec(url)?.[1];

  if (!encodedPath) {
    return null;
  }

  const path = decodeURIComponent(encodedPath);

  return path.startsWith('guide-documents/') ? path : null;
}

function buildAnonymizedEmail(auditLogId: string): string {
  return `deleted-${auditLogId}@privacy.conexaofavela.local`;
}

function buildGuideProfilePatch(
  guideProfile: FunctionGuideProfileForErasure,
): AccountErasurePlan['userPatch']['guideProfile'] {
  return {
    bio: { pt: 'Perfil removido por solicitacao LGPD.' },
    communityId: guideProfile.communityId,
    documents: {
      cpfHash: 'erased',
      documentUrls: [],
    },
    languagesSpoken:
      guideProfile.languagesSpoken.length > 0 ? guideProfile.languagesSpoken : ['pt'],
    rating: guideProfile.rating,
    subAreaIds: guideProfile.subAreaIds,
    totalReviews: guideProfile.totalReviews,
    totalToursCompleted: guideProfile.totalToursCompleted,
    verified: false,
    yearsOfExperience: guideProfile.yearsOfExperience,
  };
}

export function buildAccountErasurePlan(
  user: FunctionUserForErasure,
  options: { readonly auditLogId: string; readonly erasedAt?: Date },
): AccountErasurePlan {
  if (user.type === 'admin') {
    throw new AccountErasurePlanError('invalid_user', 'Admin accounts cannot self-erase here.');
  }

  const erasedAt = options.erasedAt ?? new Date();
  const documentUrls = user.guideProfile?.documents.documentUrls ?? [];
  const privateStoragePaths = documentUrls
    .map(extractPrivateStoragePath)
    .filter((path): path is string => path !== null);
  const userPatch: AccountErasurePlan['userPatch'] = {
    displayName: 'Conta excluida',
    email: buildAnonymizedEmail(options.auditLogId),
    notificationsEnabled: false,
    privacy: {
      anonymizedAt: erasedAt,
      erasureRequestedAt: erasedAt,
      status: 'erased',
    },
    ...(user.guideProfile ? { guideProfile: buildGuideProfilePatch(user.guideProfile) } : {}),
  };

  return {
    auditLog: {
      action: 'account_erased',
      actorId: user.id,
      createdAt: erasedAt,
      id: options.auditLogId,
      metadata: {
        documentCount: documentUrls.length,
        privateStoragePathCount: privateStoragePaths.length,
        source: 'cloud_function',
        userType: user.type,
      },
      targetUserId: user.id,
    },
    deleteFieldPaths: ['phone', 'photoUrl', 'touristProfile'],
    erasedAt,
    privateStoragePaths,
    response: {
      anonymized: true,
      auditAction: 'account_erased',
      privateStoragePathCount: privateStoragePaths.length,
      userId: user.id,
    },
    userPatch,
  };
}
