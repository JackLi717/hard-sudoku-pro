import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { useScreenState } from '../screen-state';
import { useAppTheme } from '../theme';
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

const medalGold = '#D4A96F';

export function CompletionCelebration({
  sessionId,
  size = 132,
}: {
  sessionId: string;
  size?: number;
}): React.JSX.Element {
  const { palette } = useAppTheme();
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
      style={[styles.root, { width: (size * 156) / 132, height: size }]}
      testID="completion-celebration"
    >
      <View style={[styles.artwork, { transform: [{ scale: size / 132 }] }]}>
        {SPARKS.map((spark, index) => (
          <Animated.View
            key={`${spark.left}:${spark.top}`}
            style={[
              styles.spark,
              {
                backgroundColor: index % 2 === 0 ? medalGold : palette.accent,
                borderRadius: spark.size / 2,
                height: spark.size,
                left: spark.left * 1.5,
                top: spark.top * 1.2,
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
          <View testID="result-victory-medal">
            <Svg width={156} height={132} viewBox="0 0 156 132">
              <Defs>
                <LinearGradient id="completionGold" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FFF0C6" />
                  <Stop offset="0.5" stopColor="#E4BD78" />
                  <Stop offset="1" stopColor="#B6803C" />
                </LinearGradient>
              </Defs>
              <Circle cx="78" cy="61" r="57" fill="#E4BD78" opacity={0.08} />
              <Circle
                cx="78"
                cy="61"
                r="52"
                stroke="#D8B575"
                strokeWidth={0.7}
                fill="none"
                opacity={0.4}
              />
              <Path
                d="M55 88 L49 122 L66 115 L78 127 L84 89 M76 89 L89 126 L98 113 L112 117 L100 84"
                fill="#B58D50"
              />
              <Path
                d="M29 97 Q9 75 22 43 M127 97 Q147 75 134 43"
                stroke="#D8B575"
                strokeWidth={1.5}
                fill="none"
              />
              {[0, 1].map(index => (
                <React.Fragment key={index}>
                  <Path
                    d="M22 51 Q7 46 15 34 Q25 39 22 51 M19 65 Q4 60 8 49 Q19 52 19 65 M21 80 Q5 78 7 67 Q19 67 21 80 M29 95 Q12 96 12 84 Q25 83 29 95"
                    fill="#D8B575"
                    transform={
                      index === 0 ? undefined : 'translate(156 0) scale(-1 1)'
                    }
                    opacity={0.9}
                  />
                </React.Fragment>
              ))}
              <Circle cx="78" cy="61" r="45" fill="url(#completionGold)" />
              <Circle
                cx="78"
                cy="61"
                r="39"
                fill="none"
                stroke="#FFF0C6"
                strokeWidth={1.5}
              />
              <Rect
                x="57"
                y="39"
                width="42"
                height="42"
                rx="5"
                stroke="#795722"
                strokeWidth={2}
                fill="none"
              />
              <Path
                d="M71 40 V80 M85 40 V80 M58 53 H98 M58 67 H98"
                stroke="#795722"
                strokeWidth={1.5}
              />
              <Rect
                x="74"
                y="56"
                width="8"
                height="8"
                rx="1.5"
                fill="#795722"
              />
              <Circle
                cx="105"
                cy="89"
                r="15"
                fill="#24694F"
                stroke="#F6DEAB"
                strokeWidth={2}
              />
              <Path
                d="M98 89 L103 94 L112 84"
                stroke="#FFF0C6"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 132,

    position: 'relative',
    width: 156,
  },
  artwork: {
    width: 156,
    height: 132,
    transformOrigin: 'top left',
  },
  spark: {
    position: 'absolute',
  },
  medalComposition: {
    alignItems: 'center',
    height: 132,
    justifyContent: 'flex-start',
    width: 156,
  },
  halo: {
    borderColor: medalGold,
    borderRadius: 46,
    borderWidth: 4,
    height: 92,
    left: 32,
    position: 'absolute',
    top: 15,
    width: 92,
  },
});
