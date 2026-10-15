import { describe, expect, it } from 'vitest';
import {
  GuideApprovalPlanError,
  buildGuideApprovalPlan,
  parseGuideApprovalRequest,
  type FunctionUser,
} from './guide-approval.js';

const pendingGuide: FunctionUser = {
  guideProfile: {
    communityId: 'alemao',
    documents: {
      documentUrls: ['gs://restricted/documents/guide-1.pdf'],
    },
    verified: false,
  },
  id: 'guide-1',
  type: 'guide',
};

describe('guide approval function planning', () => {
  it('parses a strict approval request payload', () => {
    expect(parseGuideApprovalRequest({ guideId: 'guide-1' })).toEqual({ guideId: 'guide-1' });
    expect(() => parseGuideApprovalRequest({ guideId: 'guide-1', admin: true })).toThrow(
      GuideApprovalPlanError,
    );
  });

  it('builds the Firestore update response and audit log for a pending guide', () => {
    const plan = buildGuideApprovalPlan(pendingGuide, {
      actorId: 'admin-1',
      approvedAt: new Date('2026-05-28T12:00:00.000Z'),
      auditLogId: 'audit-1',
    });

    expect(plan.status).toBe('approved');

    if (plan.status !== 'approved') {
      throw new Error('Expected an approval plan');
    }

    expect(plan.auditLog.action).toBe('guide_approved');
    expect(plan.auditLog.actorId).toBe('admin-1');
    expect(plan.response.verifiedAtIso).toBe('2026-05-28T12:00:00.000Z');
  });

  it('rejects non-guide users before creating an audit plan', () => {
    expect(() =>
      buildGuideApprovalPlan(
        {
          id: 'tourist-1',
          type: 'tourist',
        },
        {
          actorId: 'admin-1',
          auditLogId: 'audit-1',
        },
      ),
    ).toThrow(GuideApprovalPlanError);
  });
});
