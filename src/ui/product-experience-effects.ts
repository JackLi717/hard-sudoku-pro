import { useEffect } from 'react';
import { Vibration } from 'react-native';
import NativeProductExperience from '../native/NativeProductExperience';

export function useKeepAwake(enabled: boolean): void {
  useEffect(() => {
    NativeProductExperience?.setKeepAwake(enabled);
    return () => NativeProductExperience?.setKeepAwake(false);
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
    NativeProductExperience?.playClick();
  }
  if (haptics) {
    Vibration.vibrate(12);
  }
}
