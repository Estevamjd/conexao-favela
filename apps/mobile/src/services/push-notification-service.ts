import type { PushRegistrationSnapshot } from '@conexao-favela/shared';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';

const PUSH_CHANNEL_ID = 'booking-updates';

let foregroundHandlerConfigured = false;

type RemotePushRegistrationInput = {
  readonly platform: 'android' | 'ios';
  readonly token: string;
};

type RemotePushRegistrationResponse = {
  readonly registered: true;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function resolveExpoProjectId(): string | undefined {
  const easConfig = Constants.easConfig as unknown;

  if (isRecord(easConfig) && typeof easConfig.projectId === 'string') {
    return easConfig.projectId;
  }

  const extra = Constants.expoConfig?.extra;

  if (!isRecord(extra) || !isRecord(extra.eas)) {
    return undefined;
  }

  return typeof extra.eas.projectId === 'string' ? extra.eas.projectId : undefined;
}

export function configureForegroundNotifications(): void {
  if (foregroundHandlerConfigured || Platform.OS === 'web') {
    return;
  }

  // Keep notification presentation centralized so screens do not each decide native behavior.
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
  });
  foregroundHandlerConfigured = true;
}

export async function registerForPushNotifications(): Promise<PushRegistrationSnapshot> {
  const updatedAtIso = new Date().toISOString();

  if (Platform.OS === 'web') {
    return {
      provider: 'web-preview',
      status: 'unsupported',
      updatedAtIso,
    };
  }

  try {
    configureForegroundNotifications();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
        importance: Notifications.AndroidImportance.HIGH,
        name: 'Booking updates',
        showBadge: true,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    const finalPermission =
      existingPermission.status === Notifications.PermissionStatus.GRANTED
        ? existingPermission
        : await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });

    if (finalPermission.status !== Notifications.PermissionStatus.GRANTED) {
      return {
        provider: 'none',
        status: 'denied',
        updatedAtIso,
      };
    }

    const projectId = resolveExpoProjectId();

    if (!projectId) {
      return {
        errorMessage: 'Expo projectId ausente em app.json/app.config.',
        provider: 'expo',
        status: 'unavailable',
        updatedAtIso,
      };
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    if (hasFirebaseConfig() && (Platform.OS === 'android' || Platform.OS === 'ios')) {
      const { functions } = getFirebaseServices();
      const registerPushToken = httpsCallable<
        RemotePushRegistrationInput,
        RemotePushRegistrationResponse
      >(functions, 'registerPushToken');

      await registerPushToken({
        platform: Platform.OS,
        token: token.data,
      });
    }

    return {
      provider: 'expo',
      status: 'granted',
      token: token.data,
      updatedAtIso,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error ? error.message : 'Falha desconhecida ao registrar push.',
      provider: 'expo',
      status: 'error',
      updatedAtIso,
    };
  }
}
