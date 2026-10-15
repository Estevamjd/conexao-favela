import type { AppNotification, DraftLocalizedText, NotificationType } from '../types';
import { timestampFromDate } from './timestamps';

export type NotificationDraftInput = {
  readonly body: DraftLocalizedText;
  readonly data?: Readonly<Record<string, string | number | boolean>>;
  readonly title: DraftLocalizedText;
  readonly type: NotificationType;
  readonly userId: string;
};

export function buildNotificationFromDraft(
  input: NotificationDraftInput,
  options: { readonly createdAt?: Date; readonly id: string },
): AppNotification {
  return {
    id: options.id,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data,
    read: false,
    createdAt: timestampFromDate(options.createdAt ?? new Date()),
  };
}

export function markNotificationRead(
  notification: AppNotification,
  options: { readonly readAt?: Date } = {},
): AppNotification {
  if (notification.read) {
    return notification;
  }

  const readAt = timestampFromDate(options.readAt ?? new Date());

  return {
    ...notification,
    read: true,
    readAt,
  };
}
