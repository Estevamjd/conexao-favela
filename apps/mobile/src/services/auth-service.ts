import type {
  AccountRegistrationInput,
  AccountErasureRequestInput,
  GuideRegistrationInput,
  ProfileUpdateInput,
  SupportedLanguageCode,
} from '@conexao-favela/shared';
import {
  INITIAL_COMMUNITY_ID,
  accountErasureRequestSchema,
  profileUpdateSchema,
} from '@conexao-favela/shared';
import {
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile as updateFirebaseAuthProfile,
  signOut as firebaseSignOut,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes } from 'firebase/storage';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Platform } from 'react-native';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';
import {
  buildGuideDocumentStoragePath,
  resolveGuideDocumentContentType,
  sanitizeGuideDocumentFileName,
} from '@/services/guide-document-upload';
import { mapFirestoreUserToAuthenticatedProfile } from '@/services/auth-profile-mapper';
import type { AuthenticatedProfile } from '@/stores/auth-store';

type UploadedGuideDocument = {
  readonly name: string;
  readonly storagePath: string;
};

const DEFAULT_CURRENCY = 'BRL';
const DEFAULT_LANGUAGE: SupportedLanguageCode = 'pt';
const DEFAULT_NOTIFICATIONS_ENABLED = true;

function createDevelopmentProfile(input: AccountRegistrationInput): AuthenticatedProfile {
  return {
    uid: `dev-${input.type}-${Date.now().toString()}`,
    displayName: input.displayName,
    email: input.email,
    guideVerified: false,
    notificationsEnabled: DEFAULT_NOTIFICATIONS_ENABLED,
    preferredCurrency: DEFAULT_CURRENCY,
    preferredLanguage: input.preferredLanguage,
    type: input.type,
  };
}

function buildBaseProfile(input: AccountRegistrationInput, uid: string) {
  const timestamp = serverTimestamp();
  const base = {
    id: uid,
    email: input.email,
    type: input.type,
    displayName: input.displayName,
    preferredLanguage: input.preferredLanguage,
    preferredCurrency: 'BRL',
    notificationsEnabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLoginAt: timestamp,
  };

  if (input.type === 'tourist') {
    return {
      ...base,
      touristProfile: {
        country: input.country ?? 'BR',
        interests: [],
        favoriteTours: [],
      },
    };
  }

  return {
    ...base,
    guideProfile: {
      bio: { pt: '' },
      communityId: INITIAL_COMMUNITY_ID,
      subAreaIds: [],
      languagesSpoken: [input.preferredLanguage],
      yearsOfExperience: 0,
      rating: 0,
      totalReviews: 0,
      totalToursCompleted: 0,
      verified: false,
      documents: {
        cpfHash: 'pending-manual-review',
        documentUrls: [],
      },
    },
  };
}

export async function registerWithEmail(
  input: AccountRegistrationInput,
): Promise<AuthenticatedProfile> {
  if (!hasFirebaseConfig()) {
    return createDevelopmentProfile(input);
  }

  const { auth, db } = getFirebaseServices();
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);

  await updateFirebaseAuthProfile(credential.user, {
    displayName: input.displayName,
  });

  await setDoc(doc(db, 'users', credential.user.uid), buildBaseProfile(input, credential.user.uid));

  return {
    uid: credential.user.uid,
    displayName: input.displayName,
    email: input.email,
    guideVerified: false,
    notificationsEnabled: DEFAULT_NOTIFICATIONS_ENABLED,
    preferredCurrency: DEFAULT_CURRENCY,
    preferredLanguage: input.preferredLanguage,
    type: input.type,
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthenticatedProfile> {
  if (!hasFirebaseConfig()) {
    return {
      uid: `dev-tourist-${Date.now().toString()}`,
      displayName: 'Visitante local',
      email,
      guideVerified: false,
      notificationsEnabled: DEFAULT_NOTIFICATIONS_ENABLED,
      preferredCurrency: DEFAULT_CURRENCY,
      preferredLanguage: DEFAULT_LANGUAGE,
      type: 'tourist',
    };
  }

  const { auth, db } = getFirebaseServices();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userRef = doc(db, 'users', credential.user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const input: AccountRegistrationInput = {
      displayName: credential.user.displayName ?? 'Viajante',
      email,
      password,
      preferredLanguage: DEFAULT_LANGUAGE,
      type: 'tourist',
      acceptedTerms: true,
      country: 'BR',
    };

    await setDoc(userRef, buildBaseProfile(input, credential.user.uid));
    return mapFirestoreUserToAuthenticatedProfile(credential.user.uid, {
      displayName: input.displayName,
      email: input.email,
      preferredLanguage: input.preferredLanguage,
      type: input.type,
    });
  }

  await updateDoc(userRef, {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return mapFirestoreUserToAuthenticatedProfile(credential.user.uid, snapshot.data());
}

export async function signInWithGoogleAccount(): Promise<AuthenticatedProfile> {
  if (!hasFirebaseConfig()) {
    return {
      uid: `dev-google-tourist-${Date.now().toString()}`,
      displayName: 'Turista Google',
      email: 'turista-google@example.com',
      guideVerified: false,
      notificationsEnabled: DEFAULT_NOTIFICATIONS_ENABLED,
      preferredCurrency: DEFAULT_CURRENCY,
      preferredLanguage: DEFAULT_LANGUAGE,
      type: 'tourist',
    };
  }

  if (Platform.OS !== 'web') {
    throw new Error('Google Sign-In nativo será habilitado quando os client IDs forem definidos.');
  }

  const { auth, db } = getFirebaseServices();
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);

  return resolveGoogleProfile(credential, db);
}

type GoogleProfileFirestore = ReturnType<typeof getFirebaseServices>['db'];

async function resolveGoogleProfile(
  credential: UserCredential,
  db: GoogleProfileFirestore,
): Promise<AuthenticatedProfile> {
  const userRef = doc(db, 'users', credential.user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const input: AccountRegistrationInput = {
      displayName: credential.user.displayName ?? 'Viajante',
      email: credential.user.email ?? '',
      password: 'google-provider-session',
      preferredLanguage: DEFAULT_LANGUAGE,
      type: 'tourist',
      acceptedTerms: true,
      country: 'BR',
    };

    await setDoc(userRef, buildBaseProfile(input, credential.user.uid));
    return mapFirestoreUserToAuthenticatedProfile(credential.user.uid, {
      displayName: input.displayName,
      email: input.email,
      preferredLanguage: input.preferredLanguage,
      type: input.type,
    });
  }

  return mapFirestoreUserToAuthenticatedProfile(credential.user.uid, snapshot.data());
}

export async function signInWithGoogleCredential(
  idToken: string,
  accessToken?: string,
): Promise<AuthenticatedProfile> {
  if (!hasFirebaseConfig()) {
    return signInWithGoogleAccount();
  }

  if (!idToken.trim()) {
    throw new Error('Google nao retornou um token de identidade valido.');
  }

  const { auth, db } = getFirebaseServices();
  const googleCredential = GoogleAuthProvider.credential(idToken, accessToken);
  const credential = await signInWithCredential(auth, googleCredential);

  return resolveGoogleProfile(credential, db);
}

export async function syncAuthenticatedProfile(uid: string): Promise<AuthenticatedProfile | null> {
  if (!hasFirebaseConfig()) {
    return null;
  }

  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, 'users', uid));

  return snapshot.exists()
    ? mapFirestoreUserToAuthenticatedProfile(snapshot.id, snapshot.data())
    : null;
}

export async function uploadGuideDocuments(
  guideId: string,
  assets: readonly DocumentPickerAsset[],
): Promise<readonly UploadedGuideDocument[]> {
  if (!hasFirebaseConfig()) {
    return assets.map((asset, index) => ({
      name: asset.name,
      storagePath: `dev://guide-documents/${guideId}/${index.toString()}-${sanitizeGuideDocumentFileName(asset.name)}`,
    }));
  }

  const { storage } = getFirebaseServices();

  return Promise.all(
    assets.map(async (asset, index) => {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const storagePath = buildGuideDocumentStoragePath({
        fileName: asset.name,
        guideId,
        index,
        uploadedAtMs: Date.now(),
      });
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, blob, {
        contentType: resolveGuideDocumentContentType(asset),
      });

      return {
        name: asset.name,
        storagePath: storageRef.fullPath,
      };
    }),
  );
}

export async function submitGuideRegistration(
  guideId: string,
  input: GuideRegistrationInput,
): Promise<AuthenticatedProfile> {
  if (!hasFirebaseConfig()) {
    return {
      uid: guideId,
      displayName: input.displayName,
      email: input.email,
      guideVerified: false,
      notificationsEnabled: DEFAULT_NOTIFICATIONS_ENABLED,
      preferredCurrency: DEFAULT_CURRENCY,
      preferredLanguage: input.languagesSpoken[0] ?? DEFAULT_LANGUAGE,
      type: 'guide',
    };
  }

  const { db } = getFirebaseServices();
  const userRef = doc(db, 'users', guideId);

  await updateDoc(userRef, {
    type: 'guide',
    displayName: input.displayName,
    email: input.email,
    updatedAt: serverTimestamp(),
    guideProfile: {
      bio: input.bio,
      communityId: input.communityId,
      subAreaIds: input.subAreaIds,
      languagesSpoken: input.languagesSpoken,
      yearsOfExperience: input.yearsOfExperience,
      rating: 0,
      totalReviews: 0,
      totalToursCompleted: 0,
      verified: false,
      documents: {
        cpfHash: 'pending-manual-review',
        documentUrls: input.documentUrls,
      },
    },
  });

  return {
    uid: guideId,
    displayName: input.displayName,
    email: input.email,
    guideVerified: false,
    notificationsEnabled: DEFAULT_NOTIFICATIONS_ENABLED,
    preferredCurrency: DEFAULT_CURRENCY,
    preferredLanguage: input.languagesSpoken[0] ?? DEFAULT_LANGUAGE,
    type: 'guide',
  };
}

export async function updateCurrentUserProfile(
  currentUser: AuthenticatedProfile,
  input: ProfileUpdateInput,
): Promise<AuthenticatedProfile> {
  const parsed = profileUpdateSchema.parse(input);
  const updatedProfile: AuthenticatedProfile = {
    ...currentUser,
    ...parsed,
  };

  if (!hasFirebaseConfig()) {
    return updatedProfile;
  }

  const { auth, db } = getFirebaseServices();

  await updateDoc(doc(db, 'users', currentUser.uid), {
    displayName: parsed.displayName,
    notificationsEnabled: parsed.notificationsEnabled,
    preferredCurrency: parsed.preferredCurrency,
    preferredLanguage: parsed.preferredLanguage,
    updatedAt: serverTimestamp(),
  });

  if (auth.currentUser?.uid === currentUser.uid) {
    await updateFirebaseAuthProfile(auth.currentUser, {
      displayName: parsed.displayName,
    });
  }

  return updatedProfile;
}

export async function signOut(): Promise<void> {
  if (!hasFirebaseConfig()) {
    return;
  }

  const { auth } = getFirebaseServices();
  await firebaseSignOut(auth);
}

export async function requestAccountErasure(): Promise<void> {
  if (!hasFirebaseConfig()) {
    return;
  }

  const { auth, functions } = getFirebaseServices();
  const input: AccountErasureRequestInput = accountErasureRequestSchema.parse({
    confirmation: 'DELETE_MY_ACCOUNT',
  });
  const eraseAccount = httpsCallable<AccountErasureRequestInput, { readonly anonymized: true }>(
    functions,
    'requestAccountErasure',
  );

  await eraseAccount(input);

  try {
    await firebaseSignOut(auth);
  } catch {
    // The callable deletes the Firebase Auth user, so the local token may already be invalid.
  }
}
