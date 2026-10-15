import { router } from 'expo-router';
import { ArrowRight, Globe2, HeartHandshake, MapPinned, ShieldCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import {
  getNextOnboardingIndex,
  isLastOnboardingSlide,
  ONBOARDING_SLIDE_KEYS,
  type OnboardingSlideKey,
} from '@/features/onboarding/onboarding-flow';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

type OnboardingSlide = {
  readonly icon: typeof HeartHandshake;
  readonly key: OnboardingSlideKey;
  readonly tone: 'primary' | 'secondary' | 'accent';
};

const firstSlide: OnboardingSlide = { icon: HeartHandshake, key: 'culture', tone: 'primary' };

const slides: readonly OnboardingSlide[] = [
  firstSlide,
  { icon: MapPinned, key: 'guides', tone: 'secondary' },
  { icon: ShieldCheck, key: 'safety', tone: 'accent' },
];

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation('auth');
  const [currentIndex, setCurrentIndex] = useState(0);
  const markOnboardingCompleted = useSessionStore((state) => state.markOnboardingCompleted);
  const activeSlide = slides[currentIndex] ?? firstSlide;
  const isLastSlide = isLastOnboardingSlide(currentIndex, slides.length);
  const toneColor = useMemo(() => {
    if (activeSlide.tone === 'secondary') {
      return theme.colors.secondaryLight;
    }

    if (activeSlide.tone === 'accent') {
      return theme.colors.accent;
    }

    return theme.colors.primary;
  }, [activeSlide.tone, theme.colors.accent, theme.colors.primary, theme.colors.secondaryLight]);
  const Icon = activeSlide.icon;

  function completeOnboarding(destination: 'home' | 'language'): void {
    markOnboardingCompleted();

    if (destination === 'language') {
      router.replace({ pathname: '/(auth)/language', params: { next: 'tourist' } });
      return;
    }

    router.replace('/(tourist)');
  }

  function advance(): void {
    if (isLastSlide) {
      completeOnboarding('language');
      return;
    }

    setCurrentIndex((index) => getNextOnboardingIndex(index, slides.length));
  }

  return (
    <Screen contentStyle={styles.screenContent} scroll={false}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Globe2 color={theme.colors.primary} size={18} />
          <AppText color={theme.colors.primary} variant="label">
            {t('onboardingBrand')}
          </AppText>
        </View>
        <PrimaryButton
          onPress={() => completeOnboarding('home')}
          style={styles.skipButton}
          variant="ghost"
        >
          {t('onboardingSkip')}
        </PrimaryButton>
      </View>

      <View
        style={[
          styles.visualPanel,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={[styles.visualOrbit, { borderColor: toneColor }]} />
        <View style={[styles.iconBadge, { backgroundColor: toneColor }]}>
          <Icon
            color={activeSlide.tone === 'accent' ? theme.colors.textPrimary : '#ffffff'}
            size={44}
          />
        </View>
        <View style={[styles.routeLine, { backgroundColor: theme.colors.primaryLight }]} />
        <View
          style={[
            styles.routePoint,
            styles.routePointStart,
            { backgroundColor: theme.colors.primary },
          ]}
        />
        <View
          style={[
            styles.routePoint,
            styles.routePointEnd,
            { backgroundColor: theme.colors.secondaryLight },
          ]}
        />
      </View>

      <View style={styles.copyBlock}>
        <AppText color={theme.colors.textSecondary} variant="label">
          {t('onboardingStep', {
            current: currentIndex + 1,
            total: ONBOARDING_SLIDE_KEYS.length,
          })}
        </AppText>
        <AppText variant="hero">{t(`onboarding.${activeSlide.key}.title`)}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {t(`onboarding.${activeSlide.key}.body`)}
        </AppText>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View
              key={slide.key}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex ? theme.colors.primary : theme.colors.border,
                  width: index === currentIndex ? 28 : 10,
                },
              ]}
            />
          ))}
        </View>

        <PrimaryButton icon={<ArrowRight color="#ffffff" size={18} />} onPress={advance}>
          {isLastSlide ? t('onboardingChooseLanguage') : t('onboardingNext')}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  copyBlock: {
    gap: 10,
  },
  dot: {
    borderRadius: 999,
    height: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  footer: {
    gap: 18,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  routeLine: {
    borderRadius: 999,
    bottom: 54,
    height: 8,
    left: 54,
    position: 'absolute',
    right: 54,
    transform: [{ rotate: '-10deg' }],
  },
  routePoint: {
    borderRadius: 999,
    height: 18,
    position: 'absolute',
    width: 18,
  },
  routePointEnd: {
    bottom: 70,
    right: 52,
  },
  routePointStart: {
    bottom: 44,
    left: 48,
  },
  screenContent: {
    justifyContent: 'space-between',
  },
  skipButton: {
    minHeight: 40,
    paddingHorizontal: 12,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  visualOrbit: {
    borderRadius: 999,
    borderWidth: 1,
    height: 164,
    opacity: 0.55,
    position: 'absolute',
    width: 164,
  },
  visualPanel: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 260,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
