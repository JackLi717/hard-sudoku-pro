import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';
import { useReducedMotionPreference } from '../use-reduced-motion';

type CompletionRewardClaimProps = {
  quickPencil: number;
  smartHint: number;
  onCollected(): void;
};

type RewardItemProps = {
  accessibilityLabel: string;
  amount: number;
  entrance: Animated.Value;
  mark: string;
  claim: Animated.Value;
  styles: ReturnType<typeof createStyles>;
  testID: string;
};

function RewardItem({
  accessibilityLabel,
  amount,
  entrance,
  mark,
  claim,
  styles,
  testID,
}: RewardItemProps): React.JSX.Element {
  return (
    <Animated.View
      accessible
      accessibilityLabel={`${accessibilityLabel}, +${amount}`}
      style={[
        styles.rewardItem,
        {
          opacity: Animated.multiply(
            entrance,
            claim.interpolate({
              inputRange: [0, 0.72, 1],
              outputRange: [1, 1, 0],
            }),
          ),
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [22, 0],
              }),
            },
            {
              translateY: claim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -58],
              }),
            },
            {
              scale: entrance.interpolate({
                inputRange: [0, 0.72, 1],
                outputRange: [0.55, 1.12, 1],
              }),
            },
          ],
        },
      ]}
      testID={testID}
    >
      <View style={styles.rewardIconDisc}>
        <Text
          accessibilityElementsHidden
          allowFontScaling={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.rewardIcon}
        >
          {mark}
        </Text>
      </View>
      <Text allowFontScaling={false} style={styles.rewardAmount}>
        +{amount}
      </Text>
    </Animated.View>
  );
}

export function CompletionRewardClaim({
  quickPencil,
  smartHint,
  onCollected,
}: CompletionRewardClaimProps): React.JSX.Element | null {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const motion = useReducedMotionPreference();
  const [visible, setVisible] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const quickEntrance = useRef(new Animated.Value(1)).current;
  const hintEntrance = useRef(new Animated.Value(1)).current;
  const claimProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!motion.ready) {
      return;
    }
    if (motion.reduceMotion) {
      setVisible(true);
      return;
    }
    const revealTimer = setTimeout(() => setVisible(true), 760);
    return () => clearTimeout(revealTimer);
  }, [motion.ready, motion.reduceMotion]);

  useEffect(() => {
    if (!visible || motion.reduceMotion) {
      return;
    }
    quickEntrance.setValue(0);
    hintEntrance.setValue(0);
    const animation = Animated.stagger(90, [
      Animated.spring(quickEntrance, {
        damping: 7,
        mass: 0.72,
        stiffness: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(hintEntrance, {
        damping: 7,
        mass: 0.72,
        stiffness: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [hintEntrance, motion.reduceMotion, quickEntrance, visible]);

  const collect = () => {
    if (collecting) {
      return;
    }
    if (!motion.ready || motion.reduceMotion) {
      setVisible(false);
      onCollected();
      return;
    }
    setCollecting(true);
    Animated.timing(claimProgress, {
      duration: 440,
      easing: Easing.in(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setVisible(false);
        onCollected();
      }
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={collect}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.backdrop} testID="completion-reward-claim">
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.rewardStage,
            {
              opacity: claimProgress.interpolate({
                inputRange: [0, 0.82, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                {
                  scale: claimProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.04],
                  }),
                },
              ],
            },
          ]}
        >
          <Text accessibilityRole="header" style={styles.title}>
            {t('result.supply.title')}
          </Text>
          <View style={styles.sparkRow} pointerEvents="none">
            <Text allowFontScaling={false} style={styles.sparkSmall}>
              ✦
            </Text>
            <Text allowFontScaling={false} style={styles.sparkLarge}>
              ✦
            </Text>
            <Text allowFontScaling={false} style={styles.sparkSmall}>
              ✦
            </Text>
          </View>
          <View style={styles.rewardRow}>
            <RewardItem
              accessibilityLabel={t('result.supply.quickPencil')}
              amount={quickPencil}
              claim={claimProgress}
              entrance={quickEntrance}
              mark="✎"
              styles={styles}
              testID="completion-reward-quick-pencil"
            />
            <RewardItem
              accessibilityLabel={t('result.supply.smartHint')}
              amount={smartHint}
              claim={claimProgress}
              entrance={hintEntrance}
              mark="?"
              styles={styles}
              testID="completion-reward-smart-hint"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: collecting }}
            disabled={collecting}
            onPress={collect}
            style={({ pressed }) => [
              styles.collectButton,
              pressed && styles.collectButtonPressed,
            ]}
            testID="completion-reward-collect"
          >
            <Text style={styles.collectText}>{t('result.supply.collect')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    backdrop: {
      alignItems: 'center',
      backgroundColor: palette.overlay,
      flex: 1,
      justifyContent: 'center',
      padding: 28,
    },
    rewardStage: {
      alignItems: 'center',
      maxWidth: 360,
      width: '100%',
    },
    title: {
      color: palette.white,
      fontSize: 25,
      fontWeight: '900',
      letterSpacing: 0.4,
      textAlign: 'center',
    },
    sparkRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 32,
      height: 36,
      justifyContent: 'center',
      marginTop: 8,
    },
    sparkSmall: {
      color: palette.accentWarm,
      fontSize: 12,
      opacity: 0.75,
    },
    sparkLarge: {
      color: palette.accentWarm,
      fontSize: 21,
    },
    rewardRow: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      marginTop: 2,
      width: '100%',
    },
    rewardItem: {
      alignItems: 'center',
      minWidth: 112,
    },
    rewardIconDisc: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 48,
      height: 96,
      justifyContent: 'center',
      width: 96,
    },
    rewardIcon: {
      color: palette.white,
      fontSize: 50,
      fontWeight: '700',
      lineHeight: 58,
      textAlign: 'center',
    },
    rewardAmount: {
      color: palette.accentWarm,
      fontSize: 27,
      fontWeight: '900',
      marginTop: 5,
    },
    collectButton: {
      alignItems: 'center',
      backgroundColor: palette.accentWarm,
      borderRadius: 16,
      marginTop: 34,
      minWidth: 210,
      paddingHorizontal: 32,
      paddingVertical: 15,
    },
    collectButtonPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.98 }],
    },
    collectText: {
      color: palette.ink,
      fontSize: 17,
      fontWeight: '900',
    },
  });
}
