import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export type ReducedMotionPreference = {
  ready: boolean;
  reduceMotion: boolean;
};

export function useReducedMotionPreference(
  animationsEnabled = true,
): ReducedMotionPreference {
  const [systemReducedMotion, setSystemReducedMotion] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let mounted = true;
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then(enabled => {
        if (mounted) {
          setSystemReducedMotion(enabled !== false);
        }
      })
      .catch(() => {
        if (mounted) {
          setSystemReducedMotion(true);
        }
      });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReducedMotion,
    );
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return {
    ready: !animationsEnabled || systemReducedMotion !== null,
    reduceMotion: !animationsEnabled || systemReducedMotion === true,
  };
}

export function useReducedMotion(animationsEnabled = true): boolean {
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then(enabled => {
        if (mounted) {
          setSystemReducedMotion(enabled === true);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReducedMotion,
    );
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return !animationsEnabled || systemReducedMotion;
}
