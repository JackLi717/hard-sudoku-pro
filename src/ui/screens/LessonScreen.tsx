import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LessonController } from '../../application/lessons/lesson-controller';
import { useLocalization, HINT_PRESENTATION_COPIES } from '../../localization';
import { LESSON_COPY } from '../../localization/lesson-copy';
import { HintWalkthroughPlayer } from '../components/HintWalkthroughPlayer';
import { AppPalette, useAppTheme } from '../theme';

export function LessonScreen({
  controller,
  onClose,
  preview = false,
}: {
  controller: LessonController;
  onClose(): void;
  preview?: boolean;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const copy = LESSON_COPY[locale];
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [snapshot, setSnapshot] = useState(controller.snapshot);
  useEffect(() => {
    setSnapshot(controller.snapshot);
    const unsubscribe = controller.subscribe(setSnapshot);
    controller.initialize();
    return unsubscribe;
  }, [controller]);
  const back = () => {
    if (!controller.back()) onClose();
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!controller.back()) onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [controller, onClose]);

  const { lesson, reading, presentation, busy } = snapshot;
  const button = (
    id: string,
    label: string,
    action: () => unknown,
    secondary = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={() => {
        action();
      }}
      testID={id}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        busy && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
        {label}
      </Text>
    </Pressable>
  );
  const section = (title: string, lines: readonly string[]) => (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {lines.map((line, index) => (
        <Text key={index} style={styles.body}>
          {line}
        </Text>
      ))}
    </View>
  );
  const title = !lesson
    ? copy.title
    : reading?.location.chapter === 'intro'
    ? copy.intro
    : reading?.location.chapter === 'proof'
    ? copy.proof
    : copy.recap;
  return (
    <View style={styles.screen} testID="lesson-screen">
      <View style={styles.header}>
        {button(
          'lesson-back',
          lesson ? copy.directory : copy.close,
          back,
          true,
        )}
        <Text accessibilityRole="header" style={styles.heading}>
          {title}
        </Text>
      </View>
      {preview ? <Text style={styles.notice}>{copy.previewNotice}</Text> : null}
      {snapshot.error ? (
        <View
          accessibilityLiveRegion="polite"
          style={styles.error}
          testID="lesson-error"
        >
          <Text style={styles.body}>
            {snapshot.error === 'load' ? copy.loadError : copy.saveError}
          </Text>
          {button('lesson-retry', copy.retry, () => controller.retry())}
        </View>
      ) : null}
      {!snapshot.ready ? (
        <Text style={styles.notice}>{busy ? copy.loading : ''}</Text>
      ) : !lesson ? (
        <ScrollView
          contentContainerStyle={styles.content}
          testID="lesson-directory"
        >
          <Text style={styles.body}>{copy.free}</Text>
          {!snapshot.lessons.length ? (
            <Text style={styles.body} testID="lesson-empty">
              {copy.empty}
            </Text>
          ) : null}
          {snapshot.continueLessonId
            ? button('lesson-continue', copy.continue, () =>
                controller.openLesson(snapshot.continueLessonId!),
              )
            : null}
          {snapshot.lessons.map(item => (
            <View key={item.id} style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {item.title}
              </Text>
              <Text style={styles.body}>{item.purpose}</Text>
              {item.prerequisiteTechniques.length ? (
                <Text style={styles.body}>
                  {copy.prerequisites}:{' '}
                  {item.prerequisiteTechniques
                    .map(
                      code =>
                        HINT_PRESENTATION_COPIES[locale].techniques[code].name,
                    )
                    .join(' · ')}
                </Text>
              ) : null}
              <Text style={styles.status} testID={`lesson-status-${item.id}`}>
                {copy[item.readingState]}
              </Text>
              {button(
                `lesson-open-${item.id}`,
                item.readingState === 'completed'
                  ? copy.readAgain
                  : item.readingState === 'reading'
                  ? copy.continue
                  : copy.begin,
                () =>
                  controller.openLesson(
                    item.id,
                    item.readingState === 'completed',
                  ),
              )}
            </View>
          ))}
        </ScrollView>
      ) : reading?.location.chapter === 'intro' ? (
        <ScrollView
          key={`${lesson.id}-intro`}
          contentContainerStyle={styles.content}
          testID="lesson-intro"
        >
          <Text accessibilityRole="header" style={styles.courseTitle}>
            {lesson.title}
          </Text>
          <Text style={styles.body}>{lesson.purpose}</Text>
          {section(copy.goal, [lesson.learningGoal])}
          {lesson.prerequisiteTechniques.length
            ? section(
                copy.prerequisites,
                lesson.prerequisiteTechniques.map(
                  code =>
                    HINT_PRESENTATION_COPIES[locale].techniques[code].name,
                ),
              )
            : null}
          {section(copy.method, lesson.findingMethod)}
          {button('lesson-start-proof', copy.start, () =>
            controller.startProof(),
          )}
        </ScrollView>
      ) : reading?.location.chapter === 'proof' && presentation ? (
        <View
          style={styles.playerFrame}
          pointerEvents={busy ? 'none' : 'auto'}
          accessibilityState={{ busy }}
        >
          <HintWalkthroughPlayer
            key={lesson.id}
            snapshot={lesson.example}
            presentation={presentation}
            pageIndex={reading.location.pageIndex}
            onPageChange={page => {
              controller.setPage(page);
            }}
            labels={{
              step: copy.step,
              back: copy.back,
              next: copy.next,
              restart: copy.replay,
            }}
            targets={
              lesson.techniqueCode === 'jellyfish'
                ? lesson.example.step.eliminations
                : undefined
            }
            onSelectTarget={target => {
              controller.selectTarget(target);
            }}
            renderHeader={() => (
              <Text style={styles.playerTitle}>{lesson.title}</Text>
            )}
            renderFooter={() => (
              <View style={styles.playerFooter}>
                {lesson.techniqueCode === 'jellyfish' ? (
                  <View style={styles.card}>
                    <Text style={styles.body}>{copy.target}</Text>
                    <View style={styles.targets}>
                      {lesson.example.step.eliminations.map(target => (
                        <Pressable
                          key={`${target.cell}:${target.digit}`}
                          testID={`lesson-target-${target.cell}-${target.digit}`}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected:
                              reading.location.target?.cell === target.cell &&
                              reading.location.target?.digit === target.digit,
                            disabled: busy,
                          }}
                          disabled={busy}
                          onPress={() => {
                            controller.selectTarget(target);
                          }}
                          style={[
                            styles.target,
                            reading.location.target?.cell === target.cell &&
                              reading.location.target?.digit === target.digit &&
                              styles.selectedTarget,
                          ]}
                        >
                          <Text style={styles.body}>
                            r{Math.floor(target.cell / 9) + 1}c
                            {(target.cell % 9) + 1} · {target.digit}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
                {reading.location.pageIndex === presentation.pages.length - 1
                  ? button('lesson-show-recap', copy.toRecap, () =>
                      controller.showRecap(),
                    )
                  : null}
              </View>
            )}
            testID="lesson-walkthrough"
          />
        </View>
      ) : reading?.location.chapter === 'recap' ? (
        <ScrollView
          key={`${lesson.id}-recap`}
          contentContainerStyle={styles.content}
          testID="lesson-recap"
        >
          <Text accessibilityRole="header" style={styles.courseTitle}>
            {lesson.title}
          </Text>
          {section(copy.recap, lesson.recap)}
          {section(copy.mistakes, lesson.commonMistakes)}
          <Text style={styles.body}>{copy.completionNote}</Text>
          {button('lesson-complete', copy.finish, () => controller.complete())}
          {button(
            'lesson-replay',
            copy.replay,
            () => controller.replay(),
            true,
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
      alignItems: 'flex-start',
    },
    heading: { color: palette.ink, fontSize: 22, fontWeight: '800' },
    content: {
      padding: 16,
      gap: 16,
      width: '100%',
      maxWidth: 740,
      alignSelf: 'center',
      paddingBottom: 40,
    },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    courseTitle: { color: palette.ink, fontSize: 24, fontWeight: '800' },
    sectionTitle: { color: palette.ink, fontSize: 18, fontWeight: '700' },
    body: { color: palette.ink, fontSize: 15, lineHeight: 23 },
    notice: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 19,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    status: { color: palette.accent, fontSize: 13, fontWeight: '700' },
    button: {
      backgroundColor: palette.accent,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
    },
    buttonText: {
      color: palette.white,
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
    },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.line,
    },
    secondaryText: { color: palette.ink },
    disabled: { opacity: 0.5 },
    error: {
      margin: 16,
      padding: 16,
      borderRadius: 12,
      borderColor: palette.line,
      borderWidth: 1,
      gap: 12,
    },
    playerFrame: { flex: 1 },
    playerTitle: {
      color: palette.ink,
      fontSize: 20,
      fontWeight: '700',
      marginHorizontal: 16,
      marginVertical: 8,
    },
    playerFooter: { paddingHorizontal: 14, paddingBottom: 20, gap: 12 },
    targets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    target: {
      borderColor: palette.line,
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      minHeight: 44,
    },
    selectedTarget: { borderColor: palette.accent, borderWidth: 2 },
  });
}
