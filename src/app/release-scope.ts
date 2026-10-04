import { NativeModules } from 'react-native';

// Only an explicitly opted-in closed-test build grants temporary Premium.
// Public builds default to false; this flag is never saved as a purchase.
export const CLOSED_BETA_PREMIUM =
  (NativeModules.StartupSplash as { closedBetaPremium?: boolean } | undefined)
    ?.closedBetaPremium === true;

// First public release must switch this off alongside the release-stage update
// in AGENTS.md. It opens Premium courses, concepts, and their exercises for
// pre-release testers; it does not grant purchases or other Premium benefits.
export const PRE_RELEASE_PREMIUM_COURSES_OPEN = true;

export const RELEASE_CORE_FEATURES = {
  game: true,
  sessionReplay: true,
  statistics: true,
  howToPlay: true,
  lessons: true,
} as const;
