import type { AuditLog, PublicGuide, User } from '../types';
import { timestampFromDate } from './timestamps';

type BuildGuideApprovalAuditLogOptions = {
  readonly actorId: string;
  readonly approvedAt?: Date;
  readonly id: string;
  readonly source: 'admin_panel_local' | 'cloud_function';
};

export function isGuidePendingApproval(user: User): boolean {
  return user.type === 'guide' && user.guideProfile?.verified === false;
}

export function filterPublicGuidesByCommunity(
  guides: readonly PublicGuide[],
  communityId: string,
): readonly PublicGuide[] {
  return guides.filter(
    (guide) => guide.active && guide.verified && guide.communityId === communityId,
  );
}

export function findPublicGuideById(
  guides: readonly PublicGuide[],
  guideId: string,
): PublicGuide | null {
  return guides.find((guide) => guide.active && guide.verified && guide.id === guideId) ?? null;
}

export function approveGuideApplication(
  user: User,
  options: { readonly approvedAt?: Date } = {},
): User {
  if (user.type !== 'guide' || !user.guideProfile || user.guideProfile.verified) {
    return user;
  }

  const approvedAt = timestampFromDate(options.approvedAt ?? new Date());

  return {
    ...user,
    guideProfile: {
      ...user.guideProfile,
      verified: true,
      verifiedAt: approvedAt,
    },
    updatedAt: approvedAt,
  };
}

export function buildGuideApprovalAuditLog(
  user: User,
  options: BuildGuideApprovalAuditLogOptions,
): AuditLog | null {
  if (user.type !== 'guide' || !user.guideProfile) {
    return null;
  }

  const approvedAt = timestampFromDate(options.approvedAt ?? new Date());

  return {
    action: 'guide_approved',
    actorId: options.actorId,
    communityId: user.guideProfile.communityId,
    createdAt: approvedAt,
    id: options.id,
    metadata: {
      documentCount: user.guideProfile.documents.documentUrls.length,
      previousVerified: user.guideProfile.verified,
      source: options.source,
    },
    targetUserId: user.id,
  };
}
