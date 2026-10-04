import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  TERM_QUESTIONS,
  type TermAnswer,
  type TermCourse,
} from '../../data/lessons/term-courses';
import { useLocalization } from '../../localization';
import {
  TERM_COURSE_COPY,
  termText,
} from '../../localization/term-course-copy';
import { AppIcon } from '../components/AppIcon';
import { type AppPalette, useAppTheme } from '../theme';

export function TermCourseScreen({
  course,
  onClose,
}: {
  course: TermCourse;
  onClose(): void;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const copy = TERM_COURSE_COPY[locale];
  const content = copy.courses[course];
  const questions = TERM_QUESTIONS[course];
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<TermAnswer | null>(null);
  const question = questions[index];
  const correct = answer === question.answer;
  const marks = new Map(
    question.marks.map(item => [`${item.row}:${item.column}`, item.label]),
  );

  return (
    <View style={styles.screen} testID="term-course-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.back}
          testID="term-course-back"
        >
          <AppIcon name="back" color={palette.accent} size={20} />
          <Text style={styles.backText}>{copy.group}</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {content.title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {content.title}
        </Text>
        {(
          [
            [copy.definition, content.definition, 'term-definition'],
            [copy.find, content.find, 'term-find'],
            [copy.mistake, content.mistake, 'term-mistake'],
          ] as const
        ).map(([heading, body, id]) => (
          <View key={id} style={styles.card} testID={id}>
            <Text style={styles.cardTitle}>{heading}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
        <View style={styles.card} testID="term-practice">
          <Text style={styles.cardTitle}>{copy.practice}</Text>
          <Text style={styles.progress} testID="term-question-count">
            {termText(copy.questionCount, {
              current: index + 1,
              total: questions.length,
            })}
          </Text>
          <Text style={styles.question} testID="term-question">
            {termText(content.templates[question.template], question.params)}
          </Text>
          <Text style={styles.diagramTitle}>{copy.diagram}</Text>
          <View style={styles.board} testID="term-diagram">
            {Array.from({ length: 9 }, (_ignoredRow, row) => (
              <View key={row} style={styles.boardRow}>
                {Array.from({ length: 9 }, (_ignoredColumn, column) => {
                  const label = marks.get(`${row + 1}:${column + 1}`);
                  return (
                    <View
                      key={column}
                      style={[
                        styles.boardCell,
                        label && styles.markedCell,
                        column === 2 || column === 5
                          ? styles.boxRight
                          : undefined,
                        row === 2 || row === 5 ? styles.boxBottom : undefined,
                      ]}
                    >
                      {label ? (
                        <Text
                          adjustsFontSizeToFit
                          minimumFontScale={0.65}
                          numberOfLines={1}
                          style={styles.candidate}
                        >
                          {label}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.options}>
            {question.choices.map(choice => (
              <Pressable
                key={choice}
                accessibilityRole="button"
                accessibilityState={{ selected: answer === choice }}
                disabled={correct}
                onPress={() => setAnswer(choice)}
                style={[
                  styles.option,
                  answer === choice && styles.selectedOption,
                ]}
                testID={`term-answer-${choice}`}
              >
                <Text
                  style={[
                    styles.optionText,
                    answer === choice && styles.selectedOptionText,
                  ]}
                >
                  {copy.answers[choice]}
                </Text>
              </Pressable>
            ))}
          </View>
          {answer ? (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.feedback, correct ? styles.correct : styles.retry]}
              testID="term-feedback"
            >
              <Text style={styles.feedbackTitle}>
                {correct ? copy.correct : copy.retry}
              </Text>
              <Text style={styles.body}>
                {correct ? content.feedback[question.answer] : content.mistake}
              </Text>
            </View>
          ) : null}
          {correct ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (index === questions.length - 1) {
                  onClose();
                } else {
                  setIndex(value => value + 1);
                  setAnswer(null);
                }
              }}
              style={styles.next}
              testID="term-next"
            >
              <Text style={styles.nextText}>
                {index === questions.length - 1 ? copy.finish : copy.next}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText: { color: palette.accent, fontSize: 14, fontWeight: '700' },
    headerTitle: {
      color: palette.ink,
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
    },
    content: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 740,
      paddingHorizontal: 16,
      paddingBottom: 40,
      gap: 14,
    },
    title: {
      color: palette.ink,
      fontSize: 25,
      fontWeight: '800',
      marginTop: 6,
    },
    card: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 18,
      gap: 10,
    },
    cardTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
    body: { color: palette.ink, fontSize: 15, lineHeight: 23 },
    progress: { color: palette.muted, fontSize: 13, fontWeight: '700' },
    question: {
      color: palette.ink,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
    },
    diagramTitle: { color: palette.muted, fontSize: 12 },
    board: {
      width: '100%',
      maxWidth: 360,
      aspectRatio: 1,
      alignSelf: 'center',
      borderColor: palette.lineStrong,
      borderWidth: 2,
    },
    boardRow: { flex: 1, flexDirection: 'row' },
    boardCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightColor: palette.line,
      borderBottomColor: palette.line,
      borderRightWidth: 0.5,
      borderBottomWidth: 0.5,
    },
    markedCell: { backgroundColor: palette.accentSoft },
    boxRight: { borderRightColor: palette.lineStrong, borderRightWidth: 2 },
    boxBottom: { borderBottomColor: palette.lineStrong, borderBottomWidth: 2 },
    candidate: {
      color: palette.accent,
      fontSize: 10,
      fontWeight: '800',
      textAlign: 'center',
      paddingHorizontal: 1,
    },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    option: {
      minHeight: 44,
      minWidth: 90,
      justifyContent: 'center',
      borderRadius: 10,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    selectedOption: {
      borderColor: palette.accent,
      backgroundColor: palette.accentSoft,
    },
    optionText: {
      color: palette.ink,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    selectedOptionText: { color: palette.accent },
    feedback: { borderRadius: 10, padding: 12, gap: 3 },
    correct: { backgroundColor: palette.accentSoft },
    retry: { backgroundColor: palette.errorSoft },
    feedbackTitle: { color: palette.ink, fontSize: 14, fontWeight: '800' },
    next: {
      minHeight: 48,
      borderRadius: 10,
      backgroundColor: palette.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    nextText: { color: palette.white, fontSize: 15, fontWeight: '800' },
  });
}
