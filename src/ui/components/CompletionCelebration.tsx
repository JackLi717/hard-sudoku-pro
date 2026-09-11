import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useScreenState } from '../screen-state';
import { AppPalette, useAppTheme } from '../theme';
import { useReducedMotionPreference } from '../use-reduced-motion';

const SPARKS = [
  { left: 4, top: 15, size: 7, distanceX: -7, distanceY: -7 },
  { left: 18, top: 1, size: 5, distanceX: -4, distanceY: -9 },
  { left: 82, top: 3, size: 6, distanceX: 5, distanceY: -9 },
  { left: 94, top: 22, size: 7, distanceX: 8, distanceY: -5 },
  { left: 2, top: 59, size: 5, distanceX: -8, distanceY: 4 },
  { left: 96, top: 62, size: 5, distanceX: 8, distanceY: 5 },
] as const;

export function CompletionCelebration({
  sessionId,
}: {
  sessionId: string;
}): React.JSX.Element {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const motion = useReducedMotionPreference();
  const [hasPlayed, setHasPlayed] = useScreenState(
    `completion-celebration:${sessionId}`,
    false,
  );
  const canPlay = useRef(!hasPlayed);
  const medalProgress = useRef(new Animated.Value(hasPlayed ? 1 : 0)).current;
  const sparkProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!motion.ready) {
      return;
    }
    medalProgress.stopAnimation();
    sparkProgress.stopAnimation();
    if (motion.reduceMotion || !canPlay.current) {
      if (canPlay.current) {
        canPlay.current = false;
        setHasPlayed(true);
      }
      medalProgress.setValue(1);
      sparkProgress.setValue(1);
      return;
    }

    canPlay.current = false;
    setHasPlayed(true);
    medalProgress.setValue(0);
    sparkProgress.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(medalProgress, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(sparkProgress, {
        delay: 120,
        duration: 780,
        easing: Easing.out(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [
    medalProgress,
    motion.ready,
    motion.reduceMotion,
    setHasPlayed,
    sparkProgress,
  ]);

  const medalStyle = {
    opacity: medalProgress,
    transform: [
      {
        translateY: medalProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
      {
        scale: medalProgress.interpolate({
          inputRange: [0, 0.72, 1],
          outputRange: [0.84, 1.06, 1],
        }),
      },
    ],
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.root}
      testID="completion-celebration"
    >
      {SPARKS.map((spark, index) => (
        <Animated.View
          key={`${spark.left}:${spark.top}`}
          style={[
            styles.spark,
            {
              backgroundColor:
                index % 2 === 0 ? palette.accentWarm : palette.accent,
              borderRadius: spark.size / 2,
              height: spark.size,
              left: spark.left,
              top: spark.top,
              width: spark.size,
            },
            {
              opacity: sparkProgress.interpolate({
                inputRange: [0, 0.16, 0.7, 1],
                outputRange: [0, 1, 0.7, 0],
              }),
              transform: [
                {
                  translateX: sparkProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, spark.distanceX],
                  }),
                },
                {
                  translateY: sparkProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, spark.distanceY],
                  }),
                },
                {
                  scale: sparkProgress.interpolate({
                    inputRange: [0, 0.2, 1],
                    outputRange: [0.5, 1, 0.7],
                  }),
                },
              ],
            },
          ]}
          testID={`completion-celebration-spark-${index}`}
        />
      ))}
      <Animated.View
        style={[styles.medalComposition, medalStyle]}
        testID="completion-celebration-medal"
      >
        <View style={[styles.medalRibbon, styles.medalRibbonLeft]} />
        <View style={[styles.medalRibbon, styles.medalRibbonRight]} />
        <View style={styles.medalOuter} testID="result-victory-medal">
          <View style={styles.medalInner}>
            <Text allowFontScaling={false} style={styles.medalStar}>
              ★
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    root: {
      height: 102,
      marginBottom: 16,
      position: 'relative',
      width: 104,
    },
    spark: {
      position: 'absolute',
    },
    medalComposition: {
      alignItems: 'center',
      height: 102,
      justifyContent: 'flex-start',
      width: 104,
    },
    medalRibbon: {
      backgroundColor: palette.accent,
      bottom: 0,
      height: 46,
      position: 'absolute',
      width: 25,
    },
    medalRibbonLeft: {
      left: 28,
      transform: [{ rotate: '12deg' }],
    },
    medalRibbonRight: {
      right: 28,
      transform: [{ rotate: '-12deg' }],
    },
    medalOuter: {
      alignItems: 'center',
      backgroundColor: palette.accentWarm,
      borderColor: palette.surface,
      borderRadius: 40,
      borderWidth: 5,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    medalInner: {
      alignItems: 'center',
      borderColor: palette.white,
      borderRadius: 30,
      borderWidth: 2,
      height: 60,
      justifyContent: 'center',
      width: 60,
    },
    medalStar: {
      color: palette.white,
      fontSize: 33,
      lineHeight: 40,
    },
  });
}
