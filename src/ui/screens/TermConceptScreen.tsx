import { LocalizedText as Text } from '../components/LocalizedText';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable } from '../components/FocusablePressable';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import {
  conceptScene,
  TERM_CONCEPT_QUESTIONS,
  type TermConcept,
} from '../../data/lessons/term-concepts';
import {
  conceptArticlePatterns,
  conceptArticleScene,
  type TermConceptArticlePattern,
} from '../../data/lessons/term-concept-article-patterns';
import { useLocalization } from '../../localization';
import { conceptArticlePatternLabel } from '../../localization/term-concept-patterns';
import {
  conceptSummary,
  peerPracticeCaption,
  conceptDiagramCaption,
  conceptDiagramStep,
} from '../../localization/term-concept-diagram-copy';
import {
  conceptText,
  TERM_CONCEPT_COPY,
  TERM_CONCEPT_UI,
  TERM_EXAMPLE_CONCLUSION,
} from '../../localization/term-concept-copy';
import { AppIcon } from '../components/AppIcon';
import { TermConceptBoard } from '../components/TermConceptBoard';
import { TermConceptPatternIcon } from '../components/TermConceptPatternIcon';
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
  const articlePatterns = conceptArticlePatterns(concept);
  const [stage, setStage] = useState<Stage>('overview');
  const [articlePattern, setArticlePattern] =
    useState<TermConceptArticlePattern>(articlePatterns[0]);
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
    if (next === 'article') setArticlePattern(articlePatterns[0]);
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
  const articleScene = conceptArticleScene(concept, articlePattern);
  const diagramCaption = conceptDiagramCaption(locale, concept, articleScene);
  const exampleBody =
    conceptDiagramStep(locale, concept, articleScene, step) ??
    [copy.definition, copy.find, TERM_EXAMPLE_CONCLUSION[locale][concept]][
      step
    ];
  const exampleTitles = [ui.observe, ui.verify, ui.conclude];
  const question = questions[index];
  const questionCaption =
    concept === 'peer'
      ? peerPracticeCaption(locale, question.scene)
      : ui.diagram;
  const questionText = question.valid
    ? copy.questionWhenValid ?? copy.question
    : copy.questionWhenInvalid ?? copy.question;
  const patternLabel = (pattern: TermConceptArticlePattern) =>
    pattern === 'default'
      ? ui.diagram
      : conceptArticlePatternLabel(locale, pattern);
  const patternParts = articlePatterns.map(pattern => pattern.split('-'));
  const patternFamilies = [...new Set(patternParts.map(parts => parts[0]))];
  const patternUnits = [...new Set(patternParts.map(parts => parts[1]))];
  const twoAxisPatterns =
    patternFamilies.length > 1 &&
    patternUnits.length > 1 &&
    articlePatterns.length === patternFamilies.length * patternUnits.length;
  const [activeFamily, activeUnit] = articlePattern.split('-');
  const patternButton = (
    id: string,
    label: string,
    selected: boolean,
    onPress: () => void,
    axis = false,
  ) => (
    <Pressable
      key={id}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.articlePatternTab,
        axis && styles.axisPatternTab,
        selected && styles.articlePatternTabSelected,
      ]}
      testID={id}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.articlePatternTabText,
          selected && styles.articlePatternTabTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
  const patternTabs = () =>
    articlePatterns.length <= 1 ? null : twoAxisPatterns ? (
      <View style={styles.patternAxes} testID="term-pattern-tabs">
        {[patternFamilies, patternUnits].map((options, axis) => (
          <View key={axis} style={styles.patternAxis}>
            {options.map(option => {
              const match = articlePatterns.find(pattern =>
                axis === 0
                  ? pattern.startsWith(`${option}-`)
                  : pattern.endsWith(`-${option}`),
              )!;
              const label = patternLabel(match).split(' · ')[axis];
              const selected =
                axis === 0 ? activeFamily === option : activeUnit === option;
              const next = articlePatterns.find(pattern =>
                axis === 0
                  ? pattern === `${option}-${activeUnit}`
                  : pattern === `${activeFamily}-${option}`,
              )!;
              return patternButton(
                `term-pattern-${axis === 0 ? 'size' : 'unit'}-${option}`,
                label,
                selected,
                () => setArticlePattern(next),
                true,
              );
            })}
          </View>
        ))}
      </View>
    ) : (
      <ScrollView
        horizontal
        style={styles.articlePatternScroller}
        contentContainerStyle={styles.articlePatternTabs}
        showsHorizontalScrollIndicator={false}
        testID="term-pattern-tabs"
      >
        {articlePatterns.map(pattern =>
          patternButton(
            `term-pattern-${pattern}`,
            patternLabel(pattern),
            articlePattern === pattern,
            () => setArticlePattern(pattern),
          ),
        )}
      </ScrollView>
    );
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
      <ScrollView
        key={stage}
        contentContainerStyle={
          stage === 'overview' ? styles.hubContent : styles.content
        }
      >
        {stage === 'overview' ? (
          <>
            <View style={styles.hubHero}>
              <View style={styles.hubSymbol}>
                <TermConceptPatternIcon
                  scene={
                    concept === 'peer'
                      ? conceptArticleScene('peer', 'all-peers')
                      : conceptScene(concept, 0, true)
                  }
                  palette={palette}
                  label={`${copy.title} · ${ui.diagram}`}
                />
              </View>
              <Text accessibilityRole="header" style={styles.hubTitle}>
                {copy.title}
              </Text>
              <Text
                style={styles.hubIntroduction}
                testID="term-concept-summary"
              >
                {conceptSummary(locale, concept)}
              </Text>
            </View>
            <View style={styles.hubActions}>
              {(
                [
                  ['article', ui.article, 'info'],
                  ['example', ui.example, 'play'],
                  ['practice', ui.practice, 'pencil'],
                ] as const
              ).map(([destination, title, icon], actionIndex) => (
                <Pressable
                  key={destination}
                  accessibilityRole="button"
                  onPress={() => open(destination)}
                  style={[
                    styles.hubAction,
                    actionIndex === 0
                      ? styles.hubActionAvailable
                      : styles.hubActionOutlined,
                  ]}
                  testID={`term-open-${destination}`}
                >
                  <AppIcon
                    name={icon}
                    color={
                      actionIndex === 0 ? palette.background : palette.accent
                    }
                    size={24}
                  />
                  <Text
                    style={[
                      styles.hubActionText,
                      actionIndex === 0
                        ? styles.hubActionTextAvailable
                        : styles.hubActionTextOutlined,
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <AppIcon
                    name="forward"
                    color={
                      actionIndex === 0 ? palette.background : palette.accent
                    }
                    size={20}
                  />
                </Pressable>
              ))}
            </View>
          </>
        ) : stage === 'article' ? (
          <>
            <Text
              accessibilityRole="header"
              style={styles.title}
              testID="term-article-title"
            >
              {copy.title}
            </Text>
            <View style={styles.boardCard}>
              {patternTabs()}
              <TermConceptBoard
                scene={articleScene}
                label={`${copy.title} · ${diagramCaption}`}
              />
              <Text style={styles.caption} testID="term-pattern-caption">
                {diagramCaption}
              </Text>
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
              {patternTabs()}
              <TermConceptBoard
                scene={articleScene}
                phase={step as 0 | 1 | 2}
                label={`${copy.title} · ${patternLabel(
                  articlePattern,
                )} · ${exampleBody}`}
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
                label={`${copy.title} · ${questionCaption}`}
              />
              <Text style={styles.caption}>{questionCaption}</Text>
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
    hubContent: {
      alignSelf: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      width: '100%',
      maxWidth: 600,
      paddingHorizontal: 24,
      paddingVertical: 36,
      gap: 40,
    },
    hubHero: { alignItems: 'flex-start', gap: 18 },
    hubSymbol: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: 18,
      height: 88,
      width: 88,
      marginBottom: 4,
    },
    hubTitle: {
      color: palette.ink,
      fontSize: 26,
      fontWeight: '700',
      lineHeight: 34,
    },
    hubIntroduction: { color: palette.muted, fontSize: 16, lineHeight: 24 },
    hubActions: { gap: 12 },
    hubAction: {
      alignItems: 'center',
      borderRadius: 16,
      flexDirection: 'row',
      gap: 14,
      minHeight: 64,
      paddingHorizontal: 20,
    },
    hubActionAvailable: { backgroundColor: palette.accent },
    hubActionOutlined: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
    },
    hubActionText: { flex: 1, fontSize: 16, fontWeight: '700' },
    hubActionTextAvailable: { color: palette.background },
    hubActionTextOutlined: { color: palette.accent },
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
    articlePatternTabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    articlePatternScroller: { alignSelf: 'stretch', flexGrow: 0 },
    patternAxes: { alignSelf: 'stretch', gap: 8, marginBottom: 6 },
    patternAxis: { flexDirection: 'row', gap: 8 },
    articlePatternTab: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 88,
      minHeight: 40,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 4,
    },
    axisPatternTab: { flex: 1, minWidth: 0 },
    articlePatternTabSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
    },
    articlePatternTabText: {
      color: palette.muted,
      fontSize: 14,
      fontWeight: '600',
    },
    articlePatternTabTextSelected: { color: palette.accent },
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
