export type FunctionCreateChatInput = { readonly bookingId: string };

export type FunctionChatAttachment = {
  readonly type: 'audio' | 'image';
  readonly url: string;
};

export type FunctionSendChatMessageInput = {
  readonly chatId: string;
  readonly text: string;
  readonly attachments?: readonly FunctionChatAttachment[];
};

export type FunctionMarkChatReadInput = { readonly chatId: string };

export type FunctionSubmitReviewInput = {
  readonly bookingId: string;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly comment: string;
  readonly photoPaths: readonly string[];
  readonly language: 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'zh' | 'ja';
};

export type FunctionModerateReviewInput = {
  readonly reviewId: string;
  readonly status: 'published' | 'rejected';
};

export class ExperienceActionError extends Error {
  constructor(
    readonly code: 'invalid_payload' | 'permission_denied' | 'invalid_state',
    message: string,
  ) {
    super(message);
    this.name = 'ExperienceActionError';
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function readBoundedString(value: unknown, minimum: number, maximum: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length >= minimum && trimmed.length <= maximum ? trimmed : null;
}

function hasOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function buildChatId(guideId: string, touristId: string): string {
  return [guideId.trim(), touristId.trim()].sort().join('_');
}

export function parseCreateChatRequest(data: unknown): FunctionCreateChatInput {
  if (!isRecord(data) || !hasOnlyKeys(data, ['bookingId'])) {
    throw new ExperienceActionError('invalid_payload', 'Chat payload is invalid.');
  }
  const bookingId = readBoundedString(data.bookingId, 1, 180);
  if (!bookingId) throw new ExperienceActionError('invalid_payload', 'Chat payload is invalid.');
  return { bookingId };
}

export function parseSendChatMessageRequest(data: unknown): FunctionSendChatMessageInput {
  if (!isRecord(data) || !hasOnlyKeys(data, ['attachments', 'chatId', 'text'])) {
    throw new ExperienceActionError('invalid_payload', 'Message payload is invalid.');
  }
  const chatId = readBoundedString(data.chatId, 1, 180);
  const text = readBoundedString(data.text, 1, 2000);
  if (!chatId || !text) {
    throw new ExperienceActionError('invalid_payload', 'Message payload is invalid.');
  }

  let attachments: readonly FunctionChatAttachment[] | undefined;
  if (data.attachments !== undefined) {
    if (!Array.isArray(data.attachments) || data.attachments.length > 4) {
      throw new ExperienceActionError('invalid_payload', 'Message attachments are invalid.');
    }
    const parsedAttachments = data.attachments.map((attachment) => {
      if (!isRecord(attachment) || !hasOnlyKeys(attachment, ['type', 'url'])) {
        throw new ExperienceActionError('invalid_payload', 'Message attachments are invalid.');
      }
      const url = readBoundedString(attachment.url, 1, 1000);
      const type: FunctionChatAttachment['type'] | null =
        attachment.type === 'audio' || attachment.type === 'image' ? attachment.type : null;
      if (!url || !type) {
        throw new ExperienceActionError('invalid_payload', 'Message attachments are invalid.');
      }
      return { type, url };
    });
    attachments = parsedAttachments;
  }

  return { attachments, chatId, text };
}

export function parseMarkChatReadRequest(data: unknown): FunctionMarkChatReadInput {
  if (!isRecord(data) || !hasOnlyKeys(data, ['chatId'])) {
    throw new ExperienceActionError('invalid_payload', 'Read receipt payload is invalid.');
  }
  const chatId = readBoundedString(data.chatId, 1, 180);
  if (!chatId) {
    throw new ExperienceActionError('invalid_payload', 'Read receipt payload is invalid.');
  }
  return { chatId };
}

export function parseSubmitReviewRequest(data: unknown): FunctionSubmitReviewInput {
  if (
    !isRecord(data) ||
    !hasOnlyKeys(data, ['bookingId', 'comment', 'language', 'photoPaths', 'rating'])
  ) {
    throw new ExperienceActionError('invalid_payload', 'Review payload is invalid.');
  }
  const bookingId = readBoundedString(data.bookingId, 1, 180);
  const comment = readBoundedString(data.comment, 10, 2000);
  const languages = ['pt', 'en', 'es', 'fr', 'de', 'it', 'zh', 'ja'] as const;
  const language = languages.find((item) => item === data.language);
  const rating =
    typeof data.rating === 'number' &&
    Number.isInteger(data.rating) &&
    data.rating >= 1 &&
    data.rating <= 5
      ? (data.rating as 1 | 2 | 3 | 4 | 5)
      : null;
  const rawPhotoPaths = Array.isArray(data.photoPaths) ? data.photoPaths : null;
  const photoPaths = rawPhotoPaths
    ? rawPhotoPaths
        .map((path) => readBoundedString(path, 1, 1000))
        .filter((path): path is string => path !== null)
    : null;

  if (
    !bookingId ||
    !comment ||
    !language ||
    !rating ||
    !photoPaths ||
    photoPaths.length !== rawPhotoPaths?.length ||
    photoPaths.length > 5
  ) {
    throw new ExperienceActionError('invalid_payload', 'Review payload is invalid.');
  }

  return { bookingId, comment, language, photoPaths, rating };
}

export function parseModerateReviewRequest(data: unknown): FunctionModerateReviewInput {
  if (!isRecord(data) || !hasOnlyKeys(data, ['reviewId', 'status'])) {
    throw new ExperienceActionError('invalid_payload', 'Review moderation payload is invalid.');
  }
  const reviewId = readBoundedString(data.reviewId, 1, 180);
  const status = data.status === 'published' || data.status === 'rejected' ? data.status : null;
  if (!reviewId || !status) {
    throw new ExperienceActionError('invalid_payload', 'Review moderation payload is invalid.');
  }
  return { reviewId, status };
}

export function assertParticipant(participants: readonly string[], userId: string): void {
  if (!participants.includes(userId)) {
    throw new ExperienceActionError('permission_denied', 'User is not a chat participant.');
  }
}

export function nextReviewStats(
  averageRating: number,
  totalReviews: number,
  rating: number,
): { readonly averageRating: number; readonly totalReviews: number } {
  if (!Number.isFinite(rating) || rating < 1 || rating > 5 || totalReviews < 0) {
    throw new ExperienceActionError('invalid_state', 'Review statistics are invalid.');
  }
  const nextTotal = totalReviews + 1;
  return {
    averageRating: (averageRating * totalReviews + rating) / nextTotal,
    totalReviews: nextTotal,
  };
}
