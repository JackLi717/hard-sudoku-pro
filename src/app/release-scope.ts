import { Platform } from 'react-native';

// Closed-test Android build only. Set this to false before a public release.
export const BETA_UNLIMITED_SMART_HINTS = Platform.OS === 'android';

export const RELEASE_CORE_FEATURES = {
  game: true,
  sessionReplay: true,
  statistics: true,
  howToPlay: true,
} as const;
