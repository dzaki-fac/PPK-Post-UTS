import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile ?? './google-services.json';

  return {
    ...config,
    name: config.name ?? 'LabPortal',
    slug: config.slug ?? 'ppk-post-uts',
    android: {
      ...config.android,
      googleServicesFile,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },
    },
  };
};
