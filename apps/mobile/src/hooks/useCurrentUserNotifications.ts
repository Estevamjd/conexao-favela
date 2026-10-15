import type { AppNotification } from '@conexao-favela/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import {
  canUseFirestoreReads,
  fetchNotificationsForUser,
  markRemoteNotificationRead,
} from '@/services/firestore-read-service';

function mergeNotificationsById(
  notificationGroups: readonly (readonly AppNotification[])[],
): readonly AppNotification[] {
  const notificationsById = new Map<string, AppNotification>();

  for (const notifications of notificationGroups) {
    for (const notification of notifications) {
      notificationsById.set(notification.id, notification);
    }
  }

  return [...notificationsById.values()].sort(
    (first, second) => second.createdAt.seconds - first.createdAt.seconds,
  );
}

export function useCurrentUserNotifications() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const localNotifications = useNotificationStore((state) => state.localNotifications);
  const markLocalNotificationRead = useNotificationStore((state) => state.markNotificationRead);
  const markAllLocalNotificationsRead = useNotificationStore(
    (state) => state.markAllNotificationsRead,
  );
  const remoteEnabled = canUseFirestoreReads() && currentUser !== null;
  const queryKey = ['user-notifications', currentUser?.uid ?? 'anonymous'];
  const remoteNotificationsQuery = useQuery({
    enabled: remoteEnabled,
    queryFn: () => fetchNotificationsForUser(currentUser?.uid ?? ''),
    queryKey,
  });
  const remoteNotifications = remoteNotificationsQuery.data ?? [];
  const notifications = mergeNotificationsById([remoteNotifications, localNotifications]);

  async function markNotificationRead(notificationId: string): Promise<void> {
    markLocalNotificationRead(notificationId);

    if (remoteNotifications.some((notification) => notification.id === notificationId)) {
      await markRemoteNotificationRead(notificationId);
      await queryClient.invalidateQueries({ queryKey });
    }
  }

  async function markAllNotificationsRead(): Promise<void> {
    markAllLocalNotificationsRead();

    const unreadRemoteNotifications = remoteNotifications.filter(
      (notification) => !notification.read,
    );

    if (unreadRemoteNotifications.length === 0) {
      return;
    }

    await Promise.all(
      unreadRemoteNotifications.map((notification) => markRemoteNotificationRead(notification.id)),
    );
    await queryClient.invalidateQueries({ queryKey });
  }

  return {
    ...remoteNotificationsQuery,
    isRemoteEnabled: remoteEnabled,
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
  };
}
