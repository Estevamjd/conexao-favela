import {
  hasUsablePushToken,
  resolveLocalizedText,
  type AppNotification,
  type SupportedLanguageCode,
} from '@conexao-favela/shared';
import { BellRing, CheckCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useCurrentUserNotifications } from '@/hooks/useCurrentUserNotifications';
import { registerForPushNotifications } from '@/services/push-notification-service';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { useAppTheme } from '@/theme/useAppTheme';

const localeByLanguage: Record<SupportedLanguageCode, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

function notificationStatusKey(notification: AppNotification) {
  return notification.read ? 'read' : 'unread';
}

export default function NotificationsScreen() {
  return (
    <RequireAuth role="tourist">
      <NotificationsContent />
    </RequireAuth>
  );
}

function NotificationsContent() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation(['common', 'notifications']);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const pushRegistration = useNotificationStore((state) => state.pushRegistration);
  const addLocalNotification = useNotificationStore((state) => state.addLocalNotification);
  const setPushRegistration = useNotificationStore((state) => state.setPushRegistration);
  const { markAllNotificationsRead, markNotificationRead, notifications } =
    useCurrentUserNotifications();
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const dateFormatter = new Intl.DateTimeFormat(localeByLanguage[language], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const canRequestPush = pushRegistration.status !== 'granted';
  const pushDetail =
    pushRegistration.status === 'granted' && hasUsablePushToken(pushRegistration)
      ? t('notifications:pushReadyBody')
      : (pushRegistration.errorMessage ?? t('notifications:pushBody'));

  async function handleRegisterPush() {
    setIsRegisteringPush(true);
    setPushRegistration({
      provider: 'none',
      status: 'requesting',
      updatedAtIso: new Date().toISOString(),
    });

    const registration = await registerForPushNotifications();
    setPushRegistration(registration);

    if (registration.status === 'granted') {
      addLocalNotification({
        body: {
          pt: 'Este aparelho ja pode receber avisos de reserva quando o backend estiver conectado.',
          en: 'This device can receive booking alerts once the backend is connected.',
          es: 'Este dispositivo podra recibir avisos de reserva cuando el backend este conectado.',
        },
        title: {
          pt: 'Push ativado',
          en: 'Push enabled',
          es: 'Push activado',
        },
        type: 'system',
        userId: currentUser?.uid ?? 'local-device',
      });
    }

    setIsRegisteringPush(false);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <AppText variant="title">{t('common:notifications')}</AppText>
          <AppText color={theme.colors.textSecondary} variant="body">
            {t('notifications:unreadCount', { count: unreadCount })}
          </AppText>
        </View>
        {unreadCount > 0 ? (
          <PrimaryButton
            icon={<CheckCheck color="#ffffff" size={18} />}
            onPress={() => {
              void markAllNotificationsRead();
            }}
            style={styles.headerButton}
          >
            {t('notifications:markAllRead')}
          </PrimaryButton>
        ) : null}
      </View>

      <InfoCard description={pushDetail} title={t('notifications:pushTitle')}>
        <View style={styles.notificationBody}>
          <View style={[styles.statusPill, { backgroundColor: theme.colors.surfaceMuted }]}>
            <BellRing
              color={
                pushRegistration.status === 'granted' ? theme.colors.success : theme.colors.primary
              }
              size={18}
            />
            <AppText
              color={
                pushRegistration.status === 'granted'
                  ? theme.colors.success
                  : theme.colors.textSecondary
              }
              variant="label"
            >
              {t(`notifications:pushStatus.${pushRegistration.status}`)}
            </AppText>
          </View>
          {canRequestPush ? (
            <PrimaryButton
              disabled={isRegisteringPush || pushRegistration.status === 'requesting'}
              icon={<BellRing color="#ffffff" size={18} />}
              onPress={() => {
                void handleRegisterPush();
              }}
              variant="secondary"
            >
              {pushRegistration.status === 'idle'
                ? t('notifications:pushEnable')
                : t('notifications:pushRetry')}
            </PrimaryButton>
          ) : null}
        </View>
      </InfoCard>

      {notifications.length === 0 ? (
        <InfoCard description={t('notifications:emptyBody')} title={t('notifications:emptyTitle')}>
          <BellRing color={theme.colors.primary} size={28} />
        </InfoCard>
      ) : (
        notifications.map((notification) => (
          <InfoCard
            key={notification.id}
            description={dateFormatter.format(notification.createdAt.toDate())}
            title={resolveLocalizedText(notification.title, language)}
          >
            <View style={styles.notificationBody}>
              <AppText color={theme.colors.textSecondary} variant="body">
                {resolveLocalizedText(notification.body, language)}
              </AppText>
              <AppText
                color={notification.read ? theme.colors.textSecondary : theme.colors.primary}
                variant="label"
              >
                {t(`notifications:${notificationStatusKey(notification)}`)}
              </AppText>
            </View>
            {!notification.read ? (
              <PrimaryButton
                icon={<CheckCheck color="#ffffff" size={18} />}
                onPress={() => {
                  void markNotificationRead(notification.id);
                }}
                variant="secondary"
              >
                {t('notifications:markRead')}
              </PrimaryButton>
            ) : null}
          </InfoCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerButton: {
    flexGrow: 1,
    maxWidth: 220,
  },
  notificationBody: {
    gap: 8,
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titleGroup: {
    flexShrink: 1,
    gap: 6,
  },
});
