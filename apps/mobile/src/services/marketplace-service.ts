import { httpsCallable } from 'firebase/functions';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';

export function canUseRemoteMarketplace(): boolean {
  return hasFirebaseConfig();
}

export async function createRemoteMarketplaceInquiry(input: {
  readonly itemId: string;
  readonly message: string;
}): Promise<string> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<typeof input, { readonly inquiryId: string }>(
    functions,
    'createMarketplaceInquiry',
  );
  return (await callable(input)).data.inquiryId;
}
