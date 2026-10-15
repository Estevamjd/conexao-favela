import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

type FirebaseServices = {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly functions: Functions;
  readonly storage: FirebaseStorage;
};

type FirebaseEnvironment = {
  readonly apiKey: string | undefined;
  readonly appId: string | undefined;
  readonly authDomain: string | undefined;
  readonly messagingSenderId: string | undefined;
  readonly projectId: string | undefined;
  readonly storageBucket: string | undefined;
};

const firebaseEnvironment: FirebaseEnvironment = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

export function hasFirebaseConfig(): boolean {
  return Object.values(firebaseEnvironment).every(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
}

export function getFirebaseServices(): FirebaseServices {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase env vars are missing. Copy .env.example and fill project values.');
  }

  const existingApp = getApps()[0];
  const app =
    existingApp ??
    initializeApp({
      apiKey: firebaseEnvironment.apiKey,
      appId: firebaseEnvironment.appId,
      authDomain: firebaseEnvironment.authDomain,
      messagingSenderId: firebaseEnvironment.messagingSenderId,
      projectId: firebaseEnvironment.projectId,
      storageBucket: firebaseEnvironment.storageBucket,
    });

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    functions: getFunctions(app, 'southamerica-east1'),
    storage: getStorage(app),
  };
}
