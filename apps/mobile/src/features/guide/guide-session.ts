import { INITIAL_TOURS } from '@conexao-favela/shared';
import type { AuthenticatedProfile } from '@/stores/auth-store';

const localGuideFallbackId = INITIAL_TOURS[0]?.guideId ?? 'local-guide-draft';

export function resolveActiveGuideId(currentUser: AuthenticatedProfile | null): string {
  return currentUser?.type === 'guide' ? currentUser.uid : localGuideFallbackId;
}

export function isGuidePreviewMode(currentUser: AuthenticatedProfile | null): boolean {
  return currentUser?.type !== 'guide';
}
