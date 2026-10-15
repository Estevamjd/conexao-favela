import { createHash } from 'node:crypto';

export type PushPlatform = 'android' | 'ios';

export type PushRegistrationInput = {
  readonly platform: PushPlatform;
  readonly token: string;
};

export type ExpoPushMessage = {
  readonly body: string;
  readonly data: Readonly<Record<string, string>>;
  readonly sound: 'default';
  readonly title: string;
  readonly to: string;
};

type NotificationForPush = {
  readonly body: Readonly<Record<string, string>>;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly title: Readonly<Record<string, string>>;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isExpoPushToken(value: string): boolean {
  return /^(Expo(nent)?PushToken)\[[A-Za-z0-9_-]+\]$/.test(value);
}

export function parsePushRegistrationInput(value: unknown): PushRegistrationInput {
  if (!isRecord(value)) {
    throw new Error('Push registration payload is invalid.');
  }

  const token = typeof value.token === 'string' ? value.token.trim() : '';
  const platform = value.platform;

  if (!isExpoPushToken(token) || (platform !== 'android' && platform !== 'ios')) {
    throw new Error('Push registration token or platform is invalid.');
  }

  return { platform, token };
}

export function pushTokenDocumentId(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function localizedCopy(copy: Readonly<Record<string, string>>, language: string): string {
  return copy[language] ?? copy.pt ?? copy.en ?? Object.values(copy)[0] ?? '';
}

function safePushData(data: Readonly<Record<string, unknown>> | undefined) {
  if (!data) {
    return {};
  }

  return Object.fromEntries(
    ['bookingId', 'communityId', 'tourId']
      .map((key) => [key, data[key]] as const)
      .filter((entry): entry is readonly [string, string] => typeof entry[1] === 'string'),
  );
}

export function buildExpoPushMessages(
  notification: NotificationForPush,
  language: string,
  tokens: readonly string[],
): readonly ExpoPushMessage[] {
  const title = localizedCopy(notification.title, language);
  const body = localizedCopy(notification.body, language);
  const data = safePushData(notification.data);

  if (!title || !body) {
    return [];
  }

  return [...new Set(tokens)].filter(isExpoPushToken).map((token) => ({
    body,
    data,
    sound: 'default',
    title,
    to: token,
  }));
}
