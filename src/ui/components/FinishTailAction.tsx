import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalization } from '../../localization';
import { useScreenState } from '../screen-state';
import { useAppTheme } from '../theme';
import { SUDOKU_BOARD_OUTER_LINE_WIDTH } from './SudokuBoard';

const BUTTON_HEIGHT = 24;
const EDGE_GAP = 2;
// The grid's outer line extends beyond its measured frame on every screen.
export const FINISH_TAIL_EDGE_HEIGHT =
  SUDOKU_BOARD_OUTER_LINE_WIDTH + EDGE_GAP * 2 + BUTTON_HEIGHT;
const PROMPT_HOLD_MS = 2000;

/** Mark the invitation read only after its full presentation finishes. */
export function FinishTailAction({
  sessionId,
  count,
  visible,
  running,
  reduceMotion,
  boardHeight,
  announceAllowed = true,
  onFinish,
}: {
  sessionId: string;
  count: number;
  visible: boolean;
  running: boolean;
  reduceMotion: boolean;
  boardHeight: number;
  announceAllowed?: boolean;
  onFinish?: () => void;
}): React.JSX.Element | null {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const [reminderComplete, setReminderComplete] = useScreenState(
    `game:${sessionId}:finish-reminder-complete`,
    false,
  );
  const [promptVisible, setPromptVisible] = useState(false);
  const [requested, setRequested] = useState(false);
  const [rowWidth, setRowWidth] = useState(0);
  const [buttonWidth, setButtonWidth] = useState(0);
  const requestPending = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const prompt = t('game.autoCompleteReady', { count });
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  const promptWidth = Math.max(0, Math.min(340, rowWidth - 32));
  const canInvite =
    announceAllowed &&
    visible &&
    !running &&
    !requested &&
    count > 0 &&
    boardHeight > 0 &&
    buttonWidth > 0 &&
    promptWidth > 0;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          height: FINISH_TAIL_EDGE_HEIGHT,
          justifyContent: 'flex-end',
          zIndex: 1,
        },
        promptArea: {
          alignItems: 'center',
          bottom: FINISH_TAIL_EDGE_HEIGHT,
          justifyContent: 'center',
          left: 0,
          position: 'absolute',
          right: 0,
        },
        prompt: {
          alignItems: 'center',
          backgroundColor: palette.surface,
          borderColor: palette.accent,
          borderRadius: 14,
          borderWidth: 1,
          elevation: 6,
          justifyContent: 'center',
          minHeight: 48,
          paddingHorizontal: 14,
          paddingVertical: 12,
          shadowColor: palette.ink,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
        },
        promptText: {
          color: palette.accent,
          fontSize: 17,
          fontWeight: '600',
          lineHeight: 24,
          textAlign: 'center',
        },
        button: {
          alignItems: 'center',
          height: FINISH_TAIL_EDGE_HEIGHT,
          justifyContent: 'center',
          paddingTop: SUDOKU_BOARD_OUTER_LINE_WIDTH,
        },
        buttonFace: {
          alignItems: 'center',
          backgroundColor: palette.accentSoft,
          borderColor: palette.accent,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          height: BUTTON_HEIGHT,
          justifyContent: 'center',
          minWidth: 72,
          paddingHorizontal: 14,
        },
        glow: {
          backgroundColor: palette.accent,
          borderRadius: 12,
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
        label: { color: palette.accent, fontSize: 13, fontWeight: '600' },
        pressed: { opacity: 0.65 },
      }),
    [palette],
  );

  useEffect(() => {
    if (!canInvite || reminderComplete) {
      setPromptVisible(false);
      return;
    }
    let active = true;
    setPromptVisible(true);
    opacity.setValue(reduceMotion ? 1 : 0);
    glow.setValue(0);
    AccessibilityInfo.announceForAccessibility(promptRef.current);
    const complete = () => {
      if (!active) return;
      setPromptVisible(false);
      setReminderComplete(true);
    };
    const animation = reduceMotion
      ? null
      : Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.delay(PROMPT_HOLD_MS),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.22,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]);
    animation?.start(({ finished }) => {
      if (finished) complete();
    });
    const timeout = reduceMotion ? setTimeout(complete, PROMPT_HOLD_MS) : null;
    return () => {
      active = false;
      if (timeout !== null) clearTimeout(timeout);
      animation?.stop();
      opacity.stopAnimation();
      glow.stopAnimation();
    };
  }, [
    canInvite,
    glow,
    opacity,
    reduceMotion,
    reminderComplete,
    setReminderComplete,
    boardHeight,
  ]);

  useEffect(() => {
    requestPending.current = running;
    setRequested(running);
  }, [running, visible]);

  if (!visible) return null;
  return (
    <View
      onLayout={event => setRowWidth(event.nativeEvent.layout.width)}
      style={styles.row}
      testID="auto-complete-action-row"
    >
      {promptVisible && !running ? (
        <View
          pointerEvents="none"
          style={[styles.promptArea, { height: boardHeight }]}
          testID="auto-complete-ready-overlay"
        >
          <Animated.View
            style={[styles.prompt, { width: promptWidth, opacity }]}
            testID="auto-complete-ready-prompt"
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              maxFontSizeMultiplier={1.3}
              numberOfLines={2}
              style={styles.promptText}
            >
              {prompt}
            </Text>
          </Animated.View>
        </View>
      ) : null}
      <Pressable
        accessibilityHint={t('game.autoCompleteHint')}
        accessibilityLabel={
          running ? t('game.completing') : t('game.autoComplete')
        }
        accessibilityRole="button"
        accessibilityState={{ disabled: running || requested, busy: running }}
        disabled={running || requested}
        hitSlop={{ left: 8, right: 0, top: 0, bottom: 0 }}
        onLayout={event => setButtonWidth(event.nativeEvent.layout.width)}
        onPress={() => {
          if (requestPending.current || !onFinish) return;
          requestPending.current = true;
          setRequested(true);
          onFinish();
        }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        testID="auto-complete-action"
      >
        <View style={styles.buttonFace} testID="auto-complete-button-face">
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { opacity: glow }]}
            testID="auto-complete-button-glow"
          />
          <Text maxFontSizeMultiplier={1.3} style={styles.label}>
            {running ? t('game.toolCompleting') : t('game.toolAutoComplete')}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
