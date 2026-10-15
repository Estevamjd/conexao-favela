import type { SupportedLanguageCode } from '@conexao-favela/shared';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes } from 'firebase/storage';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';

export function canUseRemoteExperienceService(): boolean {
  return hasFirebaseConfig();
}

export async function createRemoteChat(bookingId: string): Promise<string> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ readonly bookingId: string }, { readonly chatId: string }>(
    functions,
    'createChat',
  );
  return (await callable({ bookingId })).data.chatId;
}

export async function sendRemoteChatMessage(input: {
  readonly chatId: string;
  readonly text: string;
}): Promise<void> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<
    typeof input,
    { readonly messageId: string; readonly sentAtIso: string }
  >(functions, 'sendChatMessage');
  await callable(input);
}

export async function markRemoteChatRead(chatId: string): Promise<void> {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<{ readonly chatId: string }, { readonly updated: number }>(
    functions,
    'markChatRead',
  );
  await callable({ chatId });
}

async function uploadReviewPhotos(
  bookingId: string,
  photoUris: readonly string[],
): Promise<readonly string[]> {
  const { auth, storage } = getFirebaseServices();
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Sign in before uploading review photos.');

  return Promise.all(
    photoUris.map(async (uri, index) => {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(
        storage,
        `review-media/${userId}/${bookingId}/${Date.now().toString()}-${index.toString()}.jpg`,
      );
      await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
      return storageRef.fullPath;
    }),
  );
}

export async function submitRemoteReview(input: {
  readonly bookingId: string;
  readonly comment: string;
  readonly language: SupportedLanguageCode;
  readonly photos: readonly string[];
  readonly rating: 1 | 2 | 3 | 4 | 5;
}): Promise<string> {
  const photoPaths = await uploadReviewPhotos(input.bookingId, input.photos);
  const { functions } = getFirebaseServices();
  const callable = httpsCallable<
    {
      readonly bookingId: string;
      readonly comment: string;
      readonly language: SupportedLanguageCode;
      readonly photoPaths: readonly string[];
      readonly rating: number;
    },
    { readonly reviewId: string }
  >(functions, 'submitReview');
  return (
    await callable({
      bookingId: input.bookingId,
      comment: input.comment,
      language: input.language,
      photoPaths,
      rating: input.rating,
    })
  ).data.reviewId;
}
