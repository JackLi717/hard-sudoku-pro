import { useEffect } from 'react';
import { Vibration } from 'react-native';
import NativeProductExperience from '../native/NativeProductExperience';

function safelyPerform(effect: () => void): void {
  try {
    effect();
  } catch {
    // Optional feedback must never block a game action.
  }
}

export function useKeepAwake(enabled: boolean): void {
  useEffect(() => {
    safelyPerform(() => NativeProductExperience?.setKeepAwake(enabled));
    return () =>
      safelyPerform(() => NativeProductExperience?.setKeepAwake(false));
  }, [enabled]);
}

export function playInteractionFeedback({
  soundEffects,
  haptics,
}: {
  soundEffects: boolean;
  haptics: boolean;
}): void {
  if (soundEffects) {
    safelyPerform(() => NativeProductExperience?.playClick());
  }
  if (haptics) {
    safelyPerform(() => Vibration.vibrate(12));
  }
}
