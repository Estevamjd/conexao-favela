/// <reference types="nativewind/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_FIREBASE_API_KEY?: string;
    readonly EXPO_PUBLIC_FIREBASE_APP_ID?: string;
    readonly EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    readonly EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly EXPO_PUBLIC_FIREBASE_PROJECT_ID?: string;
    readonly EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
    readonly EXPO_PUBLIC_SENTRY_DSN?: string;
    readonly EXPO_PUBLIC_SENTRY_ENVIRONMENT?: string;
    readonly EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE?: string;
  }
}
