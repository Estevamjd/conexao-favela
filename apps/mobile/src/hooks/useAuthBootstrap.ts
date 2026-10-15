import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';
import { syncAuthenticatedProfile } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSessionStore } from '@/stores/session-store';

export function useAuthBootstrap(): void {
  useEffect(() => {
    const { clearCurrentUser, setAuthReady, setCurrentUser, setError, setLoading } =
      useAuthStore.getState();

    if (!hasFirebaseConfig()) {
      setAuthReady(true);
      return undefined;
    }

    const { auth } = getFirebaseServices();

    setAuthReady(false);
    setLoading(true);

    return onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        try {
          if (!firebaseUser) {
            clearCurrentUser();
            return;
          }

          const profile = await syncAuthenticatedProfile(firebaseUser.uid);

          if (!profile) {
            clearCurrentUser();
            setError('Perfil de usuario nao encontrado no Firestore.');
            return;
          }

          setCurrentUser(profile);
          useSessionStore.getState().setActiveProfile(profile.type);
          useSessionStore.getState().setPreferredLanguage(profile.preferredLanguage);
          useSessionStore.getState().setPreferredCurrency(profile.preferredCurrency);
          useSessionStore.getState().setNotificationsEnabled(profile.notificationsEnabled);
        } catch (error) {
          clearCurrentUser();
          setError(error instanceof Error ? error.message : 'Falha ao sincronizar sessao.');
        } finally {
          setLoading(false);
          setAuthReady(true);
        }
      })();
    });
  }, []);
}
