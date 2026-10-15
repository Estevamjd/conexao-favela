type TimestampLike = {
  readonly nanoseconds?: number;
  readonly seconds?: number;
  toDate(): Date;
};

type FunctionGuideProfile = {
  readonly communityId: string;
  readonly documents: {
    readonly documentUrls: readonly string[];
  };
  readonly verified: boolean;
  readonly verifiedAt?: TimestampLike;
};

export type FunctionUser = {
  readonly guideProfile?: FunctionGuideProfile;
  readonly id: string;
  readonly type: 'tourist' | 'guide' | 'admin';
};

export type FunctionAuditLog = {
  readonly action: 'guide_approved';
  readonly actorId: string;
  readonly communityId: string;
  readonly createdAt: Date;
  readonly id: string;
  readonly metadata: {
    readonly documentCount: number;
    readonly previousVerified: boolean;
    readonly source: 'cloud_function';
  };
  readonly targetUserId: string;
};

export type GuideApprovalRequestInput = {
  readonly guideId: string;
};

export type GuideApprovalResponse = {
  readonly alreadyApproved: boolean;
  readonly approved: boolean;
  readonly auditAction?: FunctionAuditLog['action'];
  readonly communityId?: string;
  readonly guideId: string;
  readonly verifiedAtIso?: string;
};

export type GuideApprovalPlan =
  | {
      readonly auditLog: FunctionAuditLog;
      readonly response: GuideApprovalResponse;
      readonly status: 'approved';
    }
  | {
      readonly response: GuideApprovalResponse;
      readonly status: 'already_approved';
    };

export class GuideApprovalPlanError extends Error {
  constructor(
    readonly code: 'invalid_payload' | 'invalid_guide',
    message: string,
  ) {
    super(message);
    this.name = 'GuideApprovalPlanError';
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

export function parseGuideApprovalRequest(data: unknown): GuideApprovalRequestInput {
  if (!isRecord(data) || typeof data.guideId !== 'string') {
    throw new GuideApprovalPlanError('invalid_payload', 'guideId is required.');
  }

  const guideId = data.guideId.trim();
  const keys = Object.keys(data);

  if (guideId.length === 0 || guideId.length > 128 || keys.some((key) => key !== 'guideId')) {
    throw new GuideApprovalPlanError('invalid_payload', 'Invalid guide approval payload.');
  }

  return { guideId };
}

export function buildGuideApprovalPlan(
  user: FunctionUser,
  options: { readonly actorId: string; readonly approvedAt?: Date; readonly auditLogId: string },
): GuideApprovalPlan {
  if (user.type !== 'guide' || !user.guideProfile) {
    throw new GuideApprovalPlanError('invalid_guide', 'Target user is not a guide application.');
  }

  if (user.guideProfile.verified) {
    return {
      response: {
        alreadyApproved: true,
        approved: false,
        communityId: user.guideProfile.communityId,
        guideId: user.id,
        verifiedAtIso: user.guideProfile.verifiedAt?.toDate().toISOString(),
      },
      status: 'already_approved',
    };
  }

  const approvedAt = options.approvedAt ?? new Date();

  return {
    auditLog: {
      action: 'guide_approved',
      actorId: options.actorId,
      communityId: user.guideProfile.communityId,
      createdAt: approvedAt,
      id: options.auditLogId,
      metadata: {
        documentCount: user.guideProfile.documents.documentUrls.length,
        previousVerified: user.guideProfile.verified,
        source: 'cloud_function',
      },
      targetUserId: user.id,
    },
    response: {
      alreadyApproved: false,
      approved: true,
      auditAction: 'guide_approved',
      communityId: user.guideProfile.communityId,
      guideId: user.id,
      verifiedAtIso: approvedAt.toISOString(),
    },
    status: 'approved',
  };
}
