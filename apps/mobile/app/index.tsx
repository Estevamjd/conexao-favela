import { Redirect } from 'expo-router';
import { useSessionStore } from '@/stores/session-store';

export default function IndexRoute() {
  const hasHydrated = useSessionStore((state) => state.hasHydrated);
  const onboardingCompleted = useSessionStore((state) => state.onboardingCompleted);

  if (!hasHydrated) {
    return null;
  }

  return <Redirect href={onboardingCompleted ? '/(tourist)' : '/(auth)/onboarding'} />;
}
