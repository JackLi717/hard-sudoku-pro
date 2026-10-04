import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  BackHandler,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  BASIC_FRAME_COUNTS,
  basicParams,
  basicScene,
} from '../../data/lessons/basic-lessons';
import {
  BASIC_LESSON_COPY,
  basicText,
  type BasicCourse,
} from '../../localization/basic-lesson-copy';
import { useLocalization } from '../../localization';
import { AppIcon, type AppIconName } from '../components/AppIcon';
import { GameToolButton } from '../components/GameToolButton';
import {
  createGameInputStyles,
  gameInputTextScale,
} from '../components/game-input-styles';
import {
  PLAY_BOARD_EDGE_INSET,
  useContainerLayout,
} from '../layout/adaptive-layout';
import { BasicLessonBoard } from '../components/BasicLessonBoard';
import { useAppTheme, type AppPalette } from '../theme';
import { useReducedMotionPreference } from '../use-reduced-motion';

export function basicSwipeDirection(dx: number, dy: number): number {
  return Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.4
    ? dx < 0
      ? 1
      : -1
    : 0;
}

export function BasicLessonScreen({
  course,
  onClose,
  onComplete = onClose,
}: {
  course: BasicCourse;
  onClose(): void;
  onComplete?(): void;
}) {
  const { locale, t } = useLocalization();
  const copy = BASIC_LESSON_COPY[locale];
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [page, setPage] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const { width, height, onLayout } = useContainerLayout();
  const count = copy.pages[course].length;
  const go = (direction: number) =>
    setPage(current => Math.max(0, Math.min(count - 1, current + direction)));
  const pager = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 14 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderRelease: (_, gesture) => {
          const direction = basicSwipeDirection(gesture.dx, gesture.dy);
          if (direction)
            setPage(current =>
              Math.max(0, Math.min(count - 1, current + direction)),
            );
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [count],
  );
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (page > 0) setPage(current => current - 1);
        else onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose, page]);
  const progress = basicText(copy.progress, {
    current: page + 1,
    total: count,
  });
  return (
    <View style={styles.root} onLayout={onLayout} testID="basic-lesson-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('app.back')}
          onPress={onClose}
          style={styles.back}
          testID="basic-close"
        >
          <AppIcon name="back" color={palette.accent} size={24} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          {copy.titles[course]}
        </Text>
        <Text
          accessibilityLabel={progress}
          style={styles.counter}
          testID="basic-page-count"
        >
          {page + 1}/{count}
        </Text>
      </View>
      <View {...pager.panHandlers} style={styles.pager} testID="basic-pager">
        <BasicPage
          key={`${course}-${page}-${locale}-${replayKey}`}
          course={course}
          page={page}
          width={width}
          height={height}
        />
      </View>
      <View style={styles.footer}>
        {course === 'how-to-play' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.replay}
            onPress={() => setReplayKey(current => current + 1)}
            style={styles.fixedReplay}
            testID="basic-replay"
          >
            <AppIcon name="replay" color={palette.accent} size={20} />
          </Pressable>
        ) : null}
        <View accessible accessibilityLabel={progress} style={styles.dots}>
          {Array.from({ length: count }, (_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.activeDot]}
            />
          ))}
        </View>
        <View style={styles.actions}>
          {page > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.previous}
              onPress={() => go(-1)}
              style={styles.previous}
              testID="basic-previous"
            >
              <AppIcon name="back" color={palette.accent} size={22} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => (page === count - 1 ? onComplete() : go(1))}
            style={styles.next}
            testID="basic-next"
          >
            <Text style={styles.nextText}>
              {page === count - 1 ? copy.done : copy.next}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function BasicPage({
  course,
  page,
  width,
  height,
}: {
  course: BasicCourse;
  page: number;
  width: number;
  height: number;
}) {
  const { locale, t } = useLocalization();
  const copy = BASIC_LESSON_COPY[locale];
  const { palette, boardTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const animated = course === 'how-to-play';
  const size = width;
  const boardSize = width - PLAY_BOARD_EDGE_INSET * 2;
  const textScale = gameInputTextScale(width, height);
  const inputStyles = useMemo(
    () => createGameInputStyles(palette, textScale),
    [palette, textScale],
  );
  const { ready, reduceMotion } = useReducedMotionPreference();
  const [frame, setFrame] = useState(0);
  const [tappedFrame, setTappedFrame] = useState<number | null>(null);
  const tapped = reduceMotion || tappedFrame === frame;
  const [active, setActive] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const [toolsY, setToolsY] = useState(boardSize + 76);
  const [keysY, setKeysY] = useState(boardSize);
  const frameCount = animated ? BASIC_FRAME_COUNTS[page] : 1;
  const scene = basicScene(course, page, frame, tapped);
  const hasPointer = Boolean(scene.pointer);
  const params = basicParams(course);
  const title = basicText(copy.pages[course][page].title, params);
  const body = basicText(copy.pages[course][page].body, params);
  const point = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const press = useRef(new Animated.Value(1)).current;
  const previousPointer = useRef(false);
  const boardOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (
      !animated ||
      !ready ||
      reduceMotion ||
      !active ||
      frame >= frameCount - 1 ||
      (hasPointer && !tapped)
    )
      return;
    const timer = setTimeout(
      () => setFrame(current => current + 1),
      page === 0 ? 1900 : hasPointer ? 550 : 1100,
    );
    return () => clearTimeout(timer);
  }, [
    active,
    animated,
    frame,
    frameCount,
    hasPointer,
    page,
    ready,
    reduceMotion,
    tapped,
  ]);
  useEffect(() => {
    if (!animated || page !== 1 || frame !== 1 || reduceMotion || !active)
      return;
    boardOpacity.setValue(0);
    const animation = Animated.timing(boardOpacity, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
      boardOpacity.setValue(1);
    };
  }, [active, animated, boardOpacity, frame, page, reduceMotion]);
  let target: { x: number; y: number } | null = null;
  if (scene.pointer?.startsWith('cell-')) {
    const cell = Number(scene.pointer.slice(5));
    target = {
      x: PLAY_BOARD_EDGE_INSET + (((cell % 9) + 0.5) * boardSize) / 9,
      y: ((Math.floor(cell / 9) + 0.5) * boardSize) / 9,
    };
  } else if (scene.pointer?.startsWith('digit-')) {
    target = {
      x: ((Number(scene.pointer.slice(6)) - 0.5) * size) / 9,
      y: keysY + 24,
    };
  } else if (scene.pointer) {
    target = {
      x: ((scene.pointer === 'pencil' ? 3.5 : 4.5) * size) / 6,
      y: toolsY + 22,
    };
  }
  const targetX = target?.x;
  const targetY = target?.y;
  useEffect(() => {
    if (targetX === undefined || targetY === undefined || !active) {
      previousPointer.current = false;
      return;
    }
    const destination = { x: targetX - 10, y: targetY - 5 };
    if (reduceMotion) {
      point.setValue(destination);
      return;
    }
    if (!previousPointer.current)
      point.setValue({ x: size - 48, y: keysY + 50 });
    previousPointer.current = true;
    press.setValue(1);
    let cancelled = false;
    const travel = Animated.timing(point, {
      toValue: destination,
      duration: 360,
      useNativeDriver: true,
    });
    const down = Animated.timing(press, {
      toValue: 0.85,
      duration: 140,
      useNativeDriver: true,
    });
    const release = Animated.timing(press, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    });
    travel.start(result => {
      if (!result.finished || cancelled) return;
      down.start(pressed => {
        if (!pressed.finished || cancelled) return;
        // Input and key feedback share the actual finger-down completion.
        setTappedFrame(frame);
        release.start();
      });
    });
    return () => {
      cancelled = true;
      travel.stop();
      down.stop();
      release.stop();
    };
  }, [
    active,
    frame,
    keysY,
    point,
    press,
    reduceMotion,
    size,
    targetX,
    targetY,
  ]);
  const caption =
    page === 1
      ? frame <= 3
        ? copy.select
        : copy.enter
      : page === 2
      ? frame <= 2
        ? copy.pencil
        : copy.note
      : copy.hint;
  const tools: { icon: AppIconName; label: string; id: string }[] = [
    { icon: 'undo', label: t('game.undo'), id: 'undo' },
    { icon: 'erase', label: t('game.erase'), id: 'erase' },
    { icon: 'sparkle', label: t('game.toolCandidates'), id: 'candidates' },
    { icon: 'pencil', label: t('game.pencil'), id: 'pencil' },
    { icon: 'hint', label: t('game.hint'), id: 'hint' },
    { icon: 'bolt', label: t('game.toolAutoComplete'), id: 'finish' },
  ];
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="basic-page-scroll"
    >
      <View style={{ width: size }}>
        <View testID="basic-demo-stage">
          <Animated.View style={{ opacity: boardOpacity }}>
            <BasicLessonBoard
              gameLayout={animated}
              scene={scene}
              size={size}
              label={`${copy.board}. ${title}. ${body}`}
            />
          </Animated.View>
          {animated && page === 0 ? (
            <View style={styles.legend}>
              {(['row', 'column', 'box'] as const).map((kind, i) => (
                <View
                  key={kind}
                  style={[
                    styles.legendItem,
                    frame !== 3 && frame !== i && styles.legendMuted,
                  ]}
                >
                  <View
                    style={[
                      styles.legendSwatch,
                      {
                        backgroundColor: [
                          boardTheme.colors.fishCover,
                          boardTheme.colors.fishBase,
                          palette.accent,
                        ][i],
                      },
                    ]}
                  />
                  <Text style={styles.legendText}>{copy[kind]}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {animated && page > 0 ? (
            <>
              <View
                style={[inputStyles.numberPad, inputStyles.numberPadPortrait]}
                onLayout={event => setKeysY(event.nativeEvent.layout.y)}
                testID="basic-number-pad"
              >
                {Array.from({ length: 9 }, (_, i) => i + 1).map(digit => (
                  <View
                    key={digit}
                    style={[
                      inputStyles.numberKey,
                      tapped &&
                        scene.pointer === `digit-${digit}` &&
                        inputStyles.numberKeySelected,
                    ]}
                    testID={`basic-digit-${digit}`}
                  >
                    <View style={inputStyles.numberKeyContent}>
                      <Text
                        allowFontScaling={false}
                        style={inputStyles.numberValue}
                      >
                        {digit}
                      </Text>
                      <Text
                        allowFontScaling={false}
                        style={
                          scene.pencil
                            ? inputStyles.numberMultiSelectCount
                            : inputStyles.numberRemaining
                        }
                      >
                        {scene.pencil
                          ? scene.selected !== null &&
                            scene.notes[scene.selected]?.includes(digit)
                            ? '−1'
                            : '+1'
                          : 9 -
                            scene.values.filter(value => value === digit)
                              .length}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <View
                style={[inputStyles.toolbar, inputStyles.toolbarPortrait]}
                onLayout={event => setToolsY(event.nativeEvent.layout.y)}
                testID="basic-toolbar"
              >
                {tools.map(tool => (
                  <GameToolButton
                    key={tool.id}
                    icon={tool.icon}
                    label={tool.label}
                    active={tool.id === 'pencil' && scene.pencil}
                    disabled
                    dimWhenDisabled={tool.id === 'finish'}
                    textScale={textScale}
                    onPress={() => {}}
                    testID={`basic-tool-${tool.id}`}
                  />
                ))}
              </View>
              <View
                pointerEvents="none"
                style={[styles.captionSlot, { top: boardSize - 76 }]}
              >
                {page !== 3 || frame >= 2 || (frame === 1 && tapped) ? (
                  <View style={styles.bubble} testID="basic-demo-caption">
                    <Text style={styles.bubbleText}>{caption}</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
          {target ? (
            <Animated.View
              pointerEvents="none"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.hand,
                {
                  transform: [
                    ...point.getTranslateTransform(),
                    { scale: press },
                  ],
                },
              ]}
              testID="basic-demo-hand"
            >
              <Svg width={42} height={50} viewBox="0 0 42 50">
                <Circle
                  cx={10}
                  cy={6}
                  r={5}
                  fill={palette.accentSoft}
                  stroke={palette.accent}
                  strokeWidth={1.5}
                />
                <Path
                  d="M10 28V7C10 2 16 2 16 7V21C17 16 22 17 22 21V23C23 18 28 20 28 24C30 20 35 23 35 27V35C35 40 32 43 31 47H17C15 41 7 36 5 32C2 26 6 24 10 28Z"
                  fill={palette.surface}
                  stroke={palette.ink}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
          ) : null}
        </View>
        {!animated || page === 0 ? (
          <View style={styles.copy}>
            <Text accessibilityRole="header" style={styles.pageTitle}>
              {title}
            </Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ) : page === 2 ? (
          <Text style={styles.notesMeaning}>{copy.notesMeaning}</Text>
        ) : null}
        {animated && reduceMotion ? (
          <View style={styles.demoActions}>
            {reduceMotion && frame < frameCount - 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setFrame(current => Math.min(frameCount - 1, current + 1))
                }
                style={styles.replay}
                testID="basic-next-frame"
              >
                <Text style={styles.replayText}>{copy.nextFrame}</Text>
                <AppIcon name="forward" color={palette.accent} size={18} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
function createStyles(p: AppPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.background },
    fixedReplay: {
      position: 'absolute',
      right: 10,
      top: -8,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    notesMeaning: {
      color: p.ink,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 14,
      paddingHorizontal: 18,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      minHeight: 60,
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: 19,
      lineHeight: 25,
      fontWeight: '700',
      color: p.ink,
    },
    counter: {
      fontSize: 16,
      color: p.accent,
      fontWeight: '600',
      paddingRight: 8,
    },
    pager: { flex: 1 },
    content: {
      alignItems: 'center',
      paddingHorizontal: 0,
      paddingTop: 12,
      paddingBottom: 20,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.line,
    },
    dots: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    dot: {
      width: 16,
      height: 4,
      borderRadius: 2,
      backgroundColor: p.line,
      opacity: 0.5,
    },
    activeDot: { backgroundColor: p.accent, opacity: 1 },
    actions: { flexDirection: 'row', gap: 12, width: '100%' },
    previous: {
      width: 54,
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: p.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    next: {
      flex: 1,
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: p.accent,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
    },
    nextText: { color: p.background, fontSize: 17, fontWeight: '700' },
    copy: { marginTop: 24, gap: 10, paddingHorizontal: 18 },
    pageTitle: {
      color: p.accent,
      fontSize: 19,
      lineHeight: 27,
      fontWeight: '700',
    },
    body: { color: p.ink, fontSize: 16, lineHeight: 25 },
    captionSlot: {
      position: 'absolute',
      left: 18,
      right: 18,
      minHeight: 62,
      justifyContent: 'center',
      paddingTop: 10,
      paddingBottom: 6,
    },
    bubble: {
      alignSelf: 'center',
      backgroundColor: p.ink,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      maxWidth: '100%',
    },
    bubbleText: {
      color: p.background,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    hand: { position: 'absolute', left: 0, top: 0, zIndex: 5 },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 24,
      marginTop: 14,
    },
    legendMuted: { opacity: 0.35 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendSwatch: { width: 10, height: 10, borderRadius: 3 },
    legendText: { color: p.ink, fontSize: 14 },
    demoActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
    },
    replay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
    },
    replayText: { color: p.accent, fontSize: 13, fontWeight: '600' },
  });
}
