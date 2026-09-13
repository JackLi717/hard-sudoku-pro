import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useScreenState } from '../screen-state';
import { AppPalette, useAppTheme } from '../theme';
import { useReducedMotionPreference } from '../use-reduced-motion';

const SPARKS = [
  { left: 3, top: 12, size: 8, distanceX: -17, distanceY: -15 },
  { left: 18, top: 0, size: 5, distanceX: -10, distanceY: -20 },
  { left: 38, top: 4, size: 6, distanceX: -3, distanceY: -22 },
  { left: 62, top: 1, size: 5, distanceX: 4, distanceY: -22 },
  { left: 82, top: 3, size: 7, distanceX: 11, distanceY: -19 },
  { left: 97, top: 20, size: 8, distanceX: 18, distanceY: -12 },
  { left: 0, top: 45, size: 5, distanceX: -20, distanceY: -2 },
  { left: 99, top: 49, size: 5, distanceX: 20, distanceY: 0 },
  { left: 4, top: 70, size: 7, distanceX: -17, distanceY: 12 },
  { left: 94, top: 72, size: 7, distanceX: 18, distanceY: 13 },
  { left: 19, top: 90, size: 5, distanceX: -9, distanceY: 17 },
  { left: 83, top: 91, size: 5, distanceX: 10, distanceY: 17 },
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
  const haloProgress = useRef(new Animated.Value(1)).current;
  const sparkProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!motion.ready) {
      return;
    }
    medalProgress.stopAnimation();
    haloProgress.stopAnimation();
    sparkProgress.stopAnimation();
    if (motion.reduceMotion || !canPlay.current) {
      if (canPlay.current) {
        canPlay.current = false;
        setHasPlayed(true);
      }
      medalProgress.setValue(1);
      haloProgress.setValue(1);
      sparkProgress.setValue(1);
      return;
    }

    canPlay.current = false;
    setHasPlayed(true);
    medalProgress.setValue(0);
    haloProgress.setValue(0);
    sparkProgress.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(medalProgress, {
        duration: 680,
        easing: Easing.out(Easing.back(1.8)),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(haloProgress, {
        delay: 70,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(sparkProgress, {
        delay: 80,
        duration: 940,
        easing: Easing.out(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [
    haloProgress,
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
          outputRange: [22, 0],
        }),
      },
      {
        scale: medalProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.48, 1],
        }),
      },
      {
        rotate: medalProgress.interpolate({
          inputRange: [0, 1],
          outputRange: ['-9deg', '0deg'],
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
        style={[
          styles.halo,
          {
            opacity: haloProgress.interpolate({
              inputRange: [0, 0.28, 1],
              outputRange: [0, 0.72, 0],
            }),
            transform: [
              {
                scale: haloProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 1.45],
                }),
              },
            ],
          },
        ]}
        testID="completion-celebration-halo"
      />
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
      height: 116,
      marginBottom: 12,
      position: 'relative',
      width: 116,
    },
    spark: {
      position: 'absolute',
    },
    medalComposition: {
      alignItems: 'center',
      height: 102,
      justifyContent: 'flex-start',
      left: 6,
      top: 5,
      width: 104,
    },
    halo: {
      borderColor: palette.accentWarm,
      borderRadius: 46,
      borderWidth: 4,
      height: 92,
      left: 12,
      position: 'absolute',
      top: 0,
      width: 92,
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
