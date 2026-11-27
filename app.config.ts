import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const basePlugins = config.plugins ?? [];
  const hasMapsPlugin = basePlugins.some(
    (entry) =>
      entry === 'react-native-maps' ||
      (Array.isArray(entry) && entry[0] === 'react-native-maps')
  );

  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  const mapsPlugin: NonNullable<ExpoConfig['plugins']>[number] = googleMapsApiKey
    ? ['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }]
    : 'react-native-maps';

  const plugins: ExpoConfig['plugins'] = hasMapsPlugin
    ? basePlugins
    : [...basePlugins, mapsPlugin];

  return {
    ...config,
    name: config.name ?? 'LabPortal',
    slug: config.slug ?? 'ppk-post-uts',
    plugins,
  };
};
