/**
 * Expo app config. Native IDs must stay stable once stores are live.
 * After `eas init`, EAS writes extra.eas.projectId — commit that value.
 */
module.exports = {
  name: 'Mayday',
  slug: 'mayday',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'mayday',
  newArchEnabled: true,
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-dev-client',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Mayday to attach pack photos for SKUs.',
      },
    ],
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'xyz.mayday.sleevefinder',
    buildNumber: '1',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: 'xyz.mayday.sleevefinder',
    versionCode: 1,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      // Set by `npx eas-cli@latest init` — do not invent an ID
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};
