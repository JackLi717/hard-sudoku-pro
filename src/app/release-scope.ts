import { NativeModules } from 'react-native';

// Only an explicitly opted-in closed-test build grants test hint credits.
// Public builds default to false; test access is never a purchase entitlement.
export const CLOSED_BETA_TEST =
  (NativeModules.StartupSplash as { closedBetaTest?: boolean } | undefined)
    ?.closedBetaTest === true;

// Course previews belong only to development.
// Public Release builds must enforce the normal course entitlement.
export function premiumCoursePreviewEnabled(): boolean {
  return __DEV__;
}

export const RELEASE_CORE_FEATURES = {
  game: true,
  sessionReplay: true,
  statistics: true,
  howToPlay: true,
  lessons: true,
} as const;
