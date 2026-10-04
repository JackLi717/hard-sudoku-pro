import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  conceptScene,
  TERM_CONCEPT_QUESTIONS,
  type TermConcept,
} from '../../data/lessons/term-concepts';
import { useLocalization } from '../../localization';
import {
  conceptText,
  TERM_CONCEPT_COPY,
  TERM_CONCEPT_UI,
  TERM_EXAMPLE_CONCLUSION,
} from '../../localization/term-concept-copy';
import { AppIcon } from '../components/AppIcon';
import { TermConceptBoard } from '../components/TermConceptBoard';
import { type AppPalette, useAppTheme } from '../theme';

type Stage = 'overview' | 'article' | 'example' | 'practice';

export function TermConceptScreen({
  concept,
  onClose,
}: {
  concept: TermConcept;
  onClose(): void;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const ui = TERM_CONCEPT_UI[locale];
  const copy = TERM_CONCEPT_COPY[locale][concept];
  const questions = TERM_CONCEPT_QUESTIONS[concept];
  const [stage, setStage] = useState<Stage>('overview');
  const [step, setStep] = useState(0);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const correct = answer === questions[index].valid;
  const back = () => {
    if (stage === 'overview') onClose();
    else if (stage === 'example' && step > 0) setStep(value => value - 1);
    else setStage('overview');
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        back();
        return true;
      },
    );
    return () => subscription.remove();
  });
  const open = (next: Stage) => {
    if (next === 'example') setStep(0);
    if (next === 'practice') {
      setIndex(0);
      setAnswer(null);
    }
    setStage(next);
  };
  const nextQuestion = () => {
    if (index === questions.length - 1) open('overview');
    else {
      setIndex(value => value + 1);
      setAnswer(null);
    }
  };
  const exampleBody = [
    copy.definition,
    copy.find,
    TERM_EXAMPLE_CONCLUSION[locale][concept],
  ][step];
  const exampleTitles = [ui.observe, ui.verify, ui.conclude];
  const question = questions[index];
  const questionText = question.valid
    ? copy.questionWhenValid ?? copy.question
    : copy.questionWhenInvalid ?? copy.question;
  return (
    <View style={styles.screen} testID="term-concept-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={back}
          style={styles.back}
          testID="term-concept-back"
        >
          <AppIcon name="back" color={palette.accent} size={20} />
          <Text style={styles.backText}>{ui.back}</Text>
        </Pressable>
      </View>
      <ScrollView key={stage} contentContainerStyle={styles.content}>
        {stage === 'overview' ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {copy.title}
            </Text>
            <Text style={styles.body}>{ui.intro}</Text>
            <TermConceptBoard
              scene={conceptScene(concept, 0, true)}
              label={`${copy.title} · ${ui.diagram}`}
            />
            {(
              [
                ['article', ui.article, copy.definition],
                ['example', ui.example, copy.find],
                [
                  'practice',
                  ui.practice,
                  conceptText(ui.questions, {
                    current: 1,
                    total: questions.length,
                  }),
                ],
              ] as const
            ).map(([destination, title, summary]) => (
              <Pressable
                key={destination}
                accessibilityRole="button"
                onPress={() => open(destination)}
                style={styles.menuCard}
                testID={`term-open-${destination}`}
              >
                <View style={styles.menuText}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <Text style={styles.summary} numberOfLines={2}>
                    {summary}
                  </Text>
                </View>
                <AppIcon name="forward" color={palette.accent} size={20} />
              </Pressable>
            ))}
          </>
        ) : stage === 'article' ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {ui.article}
            </Text>
            <View style={styles.boardCard}>
              <TermConceptBoard
                scene={conceptScene(concept, 0, true)}
                label={`${copy.title} · ${ui.diagram}`}
              />
              <Text style={styles.caption}>{ui.diagram}</Text>
            </View>
            {(
              [
                [ui.definition, copy.definition, 'term-definition'],
                [ui.find, copy.find, 'term-find'],
                [ui.mistake, copy.mistake, 'term-mistake'],
              ] as const
            ).map(([heading, body, id]) => (
              <View key={id} style={styles.card} testID={id}>
                <Text style={styles.cardTitle}>{heading}</Text>
                <Text style={styles.body}>{body}</Text>
              </View>
            ))}
            <Action
              label={ui.example}
              onPress={() => open('example')}
              styles={styles}
              id="term-start-example"
            />
          </>
        ) : stage === 'example' ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {ui.example}
            </Text>
            <Text style={styles.progress} testID="term-step-count">
              {conceptText(ui.page, { current: step + 1, total: 3 })}
            </Text>
            <View style={styles.boardCard}>
              <TermConceptBoard
                scene={conceptScene(concept, 0, true)}
                phase={step as 0 | 1 | 2}
                label={`${copy.title} · ${exampleTitles[step]}`}
              />
            </View>
            <View style={styles.card} testID="term-example-explanation">
              <Text style={styles.cardTitle}>{exampleTitles[step]}</Text>
              <Text style={styles.body}>{exampleBody}</Text>
            </View>
            <Action
              label={step === 2 ? ui.practice : ui.next}
              onPress={() =>
                step === 2 ? open('practice') : setStep(value => value + 1)
              }
              styles={styles}
              id="term-example-next"
            />
          </>
        ) : (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {ui.practice}
            </Text>
            <Text style={styles.progress} testID="term-question-count">
              {conceptText(ui.questions, {
                current: index + 1,
                total: questions.length,
              })}
            </Text>
            <View style={styles.boardCard}>
              <TermConceptBoard
                scene={question.scene}
                label={`${copy.title} · ${ui.diagram}`}
              />
              <Text style={styles.caption}>{ui.diagram}</Text>
            </View>
            <Text style={styles.question} testID="term-question">
              {questionText}
            </Text>
            <View style={styles.answers}>
              {([true, false] as const).map(value => (
                <Pressable
                  key={String(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: answer === value }}
                  disabled={correct}
                  onPress={() => setAnswer(value)}
                  style={[
                    styles.answer,
                    answer === value && styles.selectedAnswer,
                  ]}
                  testID={`term-answer-${value ? 'yes' : 'no'}`}
                >
                  <Text
                    style={[
                      styles.answerText,
                      answer === value && styles.selectedAnswerText,
                    ]}
                  >
                    {value ? ui.yes : ui.no}
                  </Text>
                </Pressable>
              ))}
            </View>
            {answer !== null ? (
              <View
                accessibilityLiveRegion="polite"
                style={styles.card}
                testID="term-feedback"
              >
                <Text style={styles.cardTitle}>
                  {correct ? ui.correct : ui.retry}
                </Text>
                <Text style={styles.body}>
                  {question.valid ? copy.find : copy.mistake}
                </Text>
              </View>
            ) : null}
            {correct ? (
              <Action
                label={index === questions.length - 1 ? ui.finish : ui.next}
                onPress={nextQuestion}
                styles={styles}
                id="term-next"
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Action({
  label,
  onPress,
  styles,
  id,
}: {
  label: string;
  onPress(): void;
  styles: ReturnType<typeof createStyles>;
  id: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
      testID={id}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
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
    body: { color: palette.ink, fontSize: 15, lineHeight: 23 },
    boardCard: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      alignItems: 'center',
    },
    caption: { color: palette.muted, fontSize: 12, marginTop: 8 },
    card: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 18,
      gap: 10,
    },
    cardTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
    menuCard: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuText: { flex: 1, gap: 5 },
    summary: { color: palette.muted, fontSize: 13, lineHeight: 19 },
    progress: { color: palette.muted, fontSize: 13, fontWeight: '700' },
    question: {
      color: palette.ink,
      fontSize: 17,
      lineHeight: 25,
      fontWeight: '700',
    },
    answers: { flexDirection: 'row', gap: 12 },
    answer: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.panelBorder,
      backgroundColor: palette.panelSurface,
      alignItems: 'center',
      paddingVertical: 14,
    },
    selectedAnswer: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    answerText: { color: palette.ink, fontSize: 16, fontWeight: '700' },
    selectedAnswerText: { color: palette.background },
    action: {
      backgroundColor: palette.accent,
      borderRadius: 12,
      alignItems: 'center',
      paddingVertical: 15,
      marginTop: 4,
    },
    actionText: { color: palette.background, fontSize: 16, fontWeight: '800' },
  });
}
