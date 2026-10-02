import { NativeModules, Platform } from 'react-native';

// The Android closed-test build opts in explicitly at build time. Public builds
// default to zero and keep the regular five-hint starting balance.
const nativeClosedBetaFloor = (
  NativeModules.StartupSplash as
    | { closedBetaSmartHintFloor?: number }
    | undefined
)?.closedBetaSmartHintFloor;
export const CLOSED_BETA_SMART_HINT_FLOOR =
  !__DEV__ &&
  Platform.OS === 'android' &&
  Number.isInteger(nativeClosedBetaFloor) &&
  nativeClosedBetaFloor! >= 0 &&
  nativeClosedBetaFloor! <= 99
    ? nativeClosedBetaFloor!
    : 0;

// The temporary closed-test unlimited hint exception has ended.
export const BETA_UNLIMITED_SMART_HINTS = false;

export const RELEASE_CORE_FEATURES = {
  game: true,
  sessionReplay: true,
  statistics: true,
  howToPlay: true,
} as const;
