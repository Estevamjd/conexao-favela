import { router } from 'expo-router';
import { BadgeCheck, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useSessionStore, type ActiveProfile } from '@/stores/session-store';

export default function ProfileTypeScreen() {
  const { t } = useTranslation('auth');
  const setActiveProfile = useSessionStore((state) => state.setActiveProfile);

  const selectProfile = (profile: ActiveProfile) => {
    setActiveProfile(profile);
    router.replace(profile === 'guide' ? '/(guide)' : '/(tourist)');
  };

  return (
    <Screen>
      <AppText variant="title">{t('accountTypeTitle')}</AppText>
      <PrimaryButton
        icon={<UserRound color="#ffffff" size={18} />}
        onPress={() => selectProfile('tourist')}
      >
        {t('tourist')}
      </PrimaryButton>
      <PrimaryButton
        icon={<BadgeCheck color="#ffffff" size={18} />}
        onPress={() => selectProfile('guide')}
        variant="secondary"
      >
        {t('guide')}
      </PrimaryButton>
    </Screen>
  );
}
