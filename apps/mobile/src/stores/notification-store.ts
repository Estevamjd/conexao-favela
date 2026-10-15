import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PUSH_REGISTRATION,
  buildNotificationFromDraft,
  isPushRegistrationSnapshot,
  markNotificationRead,
  reviveNotificationTimestamps,
  type AppNotification,
  type NotificationDraftInput,
  type PushRegistrationSnapshot,
} from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type NotificationState = {
  readonly localNotifications: readonly AppNotification[];
  readonly pushRegistration: PushRegistrationSnapshot;
  readonly addLocalNotification: (input: NotificationDraftInput) => AppNotification;
  readonly markAllNotificationsRead: () => void;
  readonly markNotificationRead: (notificationId: string) => void;
  readonly resetLocalNotifications: () => void;
  readonly resetPushRegistration: () => void;
  readonly setPushRegistration: (registration: PushRegistrationSnapshot) => void;
};

type PersistedNotificationState = Pick<
  NotificationState,
  'localNotifications' | 'pushRegistration'
>;

function createLocalNotificationId() {
  return `local-notification-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isPersistedNotificationState(value: unknown): value is PersistedNotificationState {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { readonly localNotifications?: unknown }).localNotifications)
  );
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      localNotifications: [],
      pushRegistration: DEFAULT_PUSH_REGISTRATION,
      addLocalNotification: (input) => {
        const notification = buildNotificationFromDraft(input, {
          id: createLocalNotificationId(),
        });

        set((state) => ({
          localNotifications: [notification, ...state.localNotifications],
        }));

        return notification;
      },
      markAllNotificationsRead: () => {
        set((state) => ({
          localNotifications: state.localNotifications.map((notification) =>
            markNotificationRead(notification),
          ),
        }));
      },
      markNotificationRead: (notificationId) => {
        set((state) => ({
          localNotifications: state.localNotifications.map((notification) =>
            notification.id === notificationId ? markNotificationRead(notification) : notification,
          ),
        }));
      },
      resetLocalNotifications: () => set({ localNotifications: [] }),
      resetPushRegistration: () => set({ pushRegistration: DEFAULT_PUSH_REGISTRATION }),
      setPushRegistration: (registration) => set({ pushRegistration: registration }),
    }),
    {
      merge: (persistedState, currentState) => {
        if (!isPersistedNotificationState(persistedState)) {
          return currentState;
        }

        return {
          ...currentState,
          localNotifications: persistedState.localNotifications.map(reviveNotificationTimestamps),
          pushRegistration: isPushRegistrationSnapshot(persistedState.pushRegistration)
            ? persistedState.pushRegistration
            : currentState.pushRegistration,
        };
      },
      name: 'conexao-favela:notifications:v1',
      partialize: (state): PersistedNotificationState => ({
        localNotifications: state.localNotifications,
        pushRegistration: state.pushRegistration,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
