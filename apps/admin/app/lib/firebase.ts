import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

type AdminFirebaseServices = {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly functions: Functions;
};

type AdminFirebaseConfig = {
  readonly apiKey: string;
  readonly appId: string;
  readonly authDomain: string;
  readonly messagingSenderId: string;
  readonly projectId: string;
  readonly storageBucket: string;
};

const firebaseEnvironment = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
} as const;

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getAdminFirebaseConfig(): AdminFirebaseConfig | null {
  const { apiKey, appId, authDomain, messagingSenderId, projectId, storageBucket } =
    firebaseEnvironment;

  if (
    !hasValue(apiKey) ||
    !hasValue(appId) ||
    !hasValue(authDomain) ||
    !hasValue(messagingSenderId) ||
    !hasValue(projectId) ||
    !hasValue(storageBucket)
  ) {
    return null;
  }

  return {
    apiKey,
    appId,
    authDomain,
    messagingSenderId,
    projectId,
    storageBucket,
  };
}

export function hasAdminFirebaseConfig(): boolean {
  return getAdminFirebaseConfig() !== null;
}

export function getAdminFirebaseServices(): AdminFirebaseServices {
  const config = getAdminFirebaseConfig();

  if (!config) {
    throw new Error('Admin Firebase env vars are missing. Fill NEXT_PUBLIC_FIREBASE_* values.');
  }

  const existingApp = getApps()[0];
  const app =
    existingApp ??
    initializeApp({
      apiKey: config.apiKey,
      appId: config.appId,
      authDomain: config.authDomain,
      messagingSenderId: config.messagingSenderId,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
    });

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    // The callable lives in Sao Paulo so admin operations stay close to the data region.
    functions: getFunctions(app, 'southamerica-east1'),
  };
}
