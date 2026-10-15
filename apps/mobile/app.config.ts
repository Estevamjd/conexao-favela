import type { ConfigContext, ExpoConfig } from 'expo/config';

export default function defineExpoConfig({ config }: ConfigContext): ExpoConfig {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();

  if (!config.name || !config.slug) {
    throw new Error('Expo app.json must define name and slug.');
  }

  return {
    ...config,
    name: config.name,
    slug: config.slug,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
      },
    },
    extra: {
      ...config.extra,
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    },
  };
}
