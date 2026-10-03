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
import type { ProductPreferences } from '../../application/app/product-preferences';
import { supportsPracticeTechnique } from '../../application/practice/practice-evaluator';
import type { PracticeProgressStore } from '../../domain/practice/progress';
import {
  bundledPracticeRepository,
  type PracticeRepository,
} from '../../data/practice/practice-catalog';
import { TECHNIQUES, TechniqueCode } from '../../domain/hints/techniques';
import { useLocalization, HINT_PRESENTATION_COPIES } from '../../localization';
import { LESSON_COPY } from '../../localization/lesson-copy';
import { LESSON_TECHNIQUE_INTROS } from '../../localization/lesson-technique-intros';
import {
  ARTICLE_ALTERNATE_DIAGRAMS,
  ARTICLE_LABELS,
  ARTICLE_PATTERN_LABELS,
  ARTICLE_PATTERN_SHORT_LABELS,
  ARTICLE_PATTERN_VARIANTS,
  ARTICLE_TECHNIQUES,
  TECHNIQUE_ARTICLE_COPY,
  type TechniquePattern,
} from '../../localization/technique-articles';
import { AppIcon } from '../components/AppIcon';
import { HintWalkthroughPlayer } from '../components/HintWalkthroughPlayer';
import { TechniquePatternDiagram } from '../components/TechniquePatternDiagram';
import { TechniquePracticeScreen } from './TechniquePracticeScreen';
import { AppPalette, useAppTheme } from '../theme';

export function LessonScreen({
  controller,
  onClose,
  preferences,
  practiceProgress,
  practiceRepository = bundledPracticeRepository,
}: {
  controller: LessonController;
  onClose(): void;
  preferences?: ProductPreferences;
  practiceProgress?: PracticeProgressStore;
  practiceRepository?: PracticeRepository;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const copy = LESSON_COPY[locale];
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [snapshot, setSnapshot] = useState(controller.snapshot);
  const [selectedTechnique, setSelectedTechnique] =
    useState<TechniqueCode | null>(null);
  const [articleOpen, setArticleOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const practiceAvailable =
    selectedTechnique !== null &&
    supportsPracticeTechnique(selectedTechnique) &&
    practiceRepository.list(selectedTechnique, 'exercise').length > 0;
  const [articlePattern, setArticlePattern] = useState<TechniquePattern>('row');
  useEffect(() => {
    setSnapshot(controller.snapshot);
    const unsubscribe = controller.subscribe(setSnapshot);
    controller.initialize();
    return unsubscribe;
  }, [controller]);
  const back = () => {
    if (practiceOpen) {
      setPracticeOpen(false);
      return;
    }
    if (controller.back()) return;
    if (articleOpen) {
      setArticleOpen(false);
      return;
    }
    if (selectedTechnique) setSelectedTechnique(null);
    else onClose();
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (practiceOpen) {
          setPracticeOpen(false);
          return true;
        }
        if (!controller.back()) {
          if (articleOpen) setArticleOpen(false);
          else if (selectedTechnique) setSelectedTechnique(null);
          else onClose();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [articleOpen, controller, onClose, practiceOpen, selectedTechnique]);

  const { lesson, reading, presentation, busy } = snapshot;
  const technique = TECHNIQUES.find(item => item.code === selectedTechnique);
  const selectedLesson = snapshot.lessons.find(
    item => item.techniqueCode === selectedTechnique,
  );
  const patternLessons = snapshot.lessons
    .filter(item => item.techniqueCode === selectedTechnique && item.pattern)
    .sort(
      (a, b) =>
        (
          ARTICLE_PATTERN_VARIANTS[
            selectedTechnique as keyof typeof ARTICLE_PATTERN_VARIANTS
          ] as readonly string[]
        ).indexOf(a.pattern!) -
        (
          ARTICLE_PATTERN_VARIANTS[
            selectedTechnique as keyof typeof ARTICLE_PATTERN_VARIANTS
          ] as readonly string[]
        ).indexOf(b.pattern!),
    );
  const showPatternTabs =
    lesson?.pattern &&
    reading?.location.chapter === 'proof' &&
    patternLessons.length > 1;
  const articleTechnique = ARTICLE_TECHNIQUES.find(
    code => code === selectedTechnique,
  );
  const article = articleTechnique
    ? TECHNIQUE_ARTICLE_COPY[locale][articleTechnique]
    : null;
  const articleLabels = ARTICLE_LABELS[locale];
  const patternVariants = articleTechnique
    ? ARTICLE_PATTERN_VARIANTS[articleTechnique]
    : null;
  const activePattern = patternVariants
    ? patternVariants.find(pattern => pattern === articlePattern) ??
      patternVariants[0]
    : null;
  const diagramCaption =
    articleTechnique && article && activePattern
      ? activePattern === patternVariants?.[0]
        ? article.diagram
        : ARTICLE_ALTERNATE_DIAGRAMS[locale][articleTechnique][activePattern] ??
          article.diagram
      : null;
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
      onPress={() => action()}
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
    ? null
    : reading?.location.chapter === 'intro'
    ? copy.intro
    : reading?.location.chapter === 'proof'
    ? lesson.title
    : copy.recap;
  const backLabel = lesson
    ? selectedTechnique
      ? copy.backToTechnique
      : copy.directory
    : articleOpen
    ? copy.backToTechnique
    : selectedTechnique
    ? copy.directory
    : copy.close;
  if (practiceOpen && selectedTechnique && practiceAvailable) {
    return (
      <TechniquePracticeScreen
        key={selectedTechnique}
        technique={selectedTechnique}
        onClose={() => setPracticeOpen(false)}
        preferences={preferences}
        practiceProgress={practiceProgress}
        practiceRepository={practiceRepository}
      />
    );
  }
  return (
    <View style={styles.screen} testID="lesson-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={back}
          style={[styles.backButton, showPatternTabs && styles.proofBackButton]}
          testID="lesson-back"
        >
          <AppIcon name="back" color={palette.accent} size={20} />
          {!showPatternTabs ? (
            <Text style={styles.backText}>{backLabel}</Text>
          ) : null}
        </Pressable>
        {title ? (
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.heading, showPatternTabs && styles.proofHeading]}
          >
            {title}
          </Text>
        ) : null}
        {showPatternTabs && lesson ? (
          <View style={styles.patternTabs} testID="lesson-pattern-tabs">
            {patternLessons.map(item => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={
                  ARTICLE_PATTERN_LABELS[locale][item.pattern!]
                }
                accessibilityState={{
                  selected: item.id === lesson.id,
                  disabled: busy,
                }}
                disabled={busy}
                onPress={() => {
                  if (item.id !== lesson.id) {
                    controller.openLesson(
                      item.id,
                      item.readingState === 'completed',
                    );
                  }
                }}
                style={[
                  styles.patternTab,
                  item.id === lesson.id && styles.patternTabSelected,
                ]}
                testID={`lesson-demonstration-${item.pattern}`}
              >
                <Text
                  style={[
                    styles.patternTabText,
                    item.id === lesson.id && styles.patternTabTextSelected,
                  ]}
                >
                  {ARTICLE_PATTERN_SHORT_LABELS[locale][item.pattern!]}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
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
      ) : !lesson && !technique ? (
        <ScrollView
          contentContainerStyle={styles.directoryContent}
          testID="lesson-directory"
        >
          {([1, 2, 3] as const).map(level => (
            <View
              key={level}
              style={styles.directoryGroupWrap}
              testID={`lesson-level-${level}`}
            >
              <Text style={styles.directoryGroupTitle}>Level {level}</Text>
              <View
                style={styles.directoryGroup}
                testID={`lesson-level-${level}-card`}
              >
                {TECHNIQUES.filter(item => item.level === level).map(
                  (item, index, group) => (
                    <Pressable
                      key={item.code}
                      accessibilityRole="button"
                      onPress={() => {
                        setArticleOpen(false);
                        setSelectedTechnique(item.code);
                      }}
                      style={[
                        styles.directoryRow,
                        index < group.length - 1 && styles.directoryRowDivider,
                      ]}
                      testID={`lesson-technique-${item.code}`}
                    >
                      <Text style={styles.directoryRowText}>
                        {
                          HINT_PRESENTATION_COPIES[locale].techniques[item.code]
                            .name
                        }
                      </Text>
                      <AppIcon name="forward" color={palette.muted} size={20} />
                    </Pressable>
                  ),
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : !lesson &&
        technique &&
        articleOpen &&
        articleTechnique &&
        article &&
        activePattern &&
        diagramCaption &&
        patternVariants ? (
        <ScrollView
          contentContainerStyle={styles.articleContent}
          testID="lesson-article"
        >
          <Text accessibilityRole="header" style={styles.articleTitle}>
            {HINT_PRESENTATION_COPIES[locale].techniques[articleTechnique].name}
          </Text>
          <View style={styles.articleDiagram} testID="lesson-diagram-card">
            {patternVariants.length > 1 ? (
              <View style={styles.articlePatternTabs}>
                {patternVariants.map(pattern => (
                  <Pressable
                    key={pattern}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activePattern === pattern }}
                    onPress={() => setArticlePattern(pattern)}
                    style={[
                      styles.articlePatternTab,
                      activePattern === pattern &&
                        styles.articlePatternTabSelected,
                    ]}
                    testID={`lesson-pattern-${pattern}`}
                  >
                    <Text
                      style={[
                        styles.articlePatternTabText,
                        activePattern === pattern &&
                          styles.articlePatternTabTextSelected,
                      ]}
                    >
                      {ARTICLE_PATTERN_LABELS[locale][pattern]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <TechniquePatternDiagram
              technique={articleTechnique}
              pattern={activePattern}
              palette={palette}
              size={186}
              accessibilityLabel={diagramCaption}
            />
            <Text style={styles.diagramCaption}>{diagramCaption}</Text>
          </View>
          <View style={styles.articleSections} testID="lesson-reading-card">
            {(
              [
                ['pattern', article.pattern],
                ['find', article.find],
                ['result', article.result],
                ['mistake', article.mistake],
              ] as const
            ).map(([key, value], index) => (
              <View
                key={key}
                style={[
                  styles.articleSection,
                  index > 0 && styles.articleSectionDivider,
                ]}
              >
                <Text style={styles.articleSectionTitle}>
                  {articleLabels[key]}
                </Text>
                <Text style={styles.articleBody}>{value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : !lesson && technique ? (
        <ScrollView
          contentContainerStyle={styles.hubContent}
          testID="lesson-hub"
        >
          <View style={styles.hubHero}>
            <View
              style={[
                styles.hubSymbol,
                articleTechnique && styles.hubPatternSymbol,
              ]}
            >
              {articleTechnique ? (
                <TechniquePatternDiagram
                  technique={articleTechnique}
                  pattern={ARTICLE_PATTERN_VARIANTS[articleTechnique][0]}
                  palette={palette}
                  size={80}
                  accessibilityLabel={article!.diagram}
                />
              ) : (
                <AppIcon name="tactic" color={palette.accent} size={32} />
              )}
            </View>
            <Text accessibilityRole="header" style={styles.hubTitle}>
              {HINT_PRESENTATION_COPIES[locale].techniques[technique.code].name}
            </Text>
            <Text
              style={styles.hubIntroduction}
              testID="lesson-technique-introduction"
            >
              {selectedLesson?.purpose ??
                LESSON_TECHNIQUE_INTROS[locale][technique.code]}
            </Text>
          </View>
          <View style={styles.hubActions}>
            {articleTechnique ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setArticlePattern(
                    ARTICLE_PATTERN_VARIANTS[articleTechnique][0],
                  );
                  setArticleOpen(true);
                }}
                style={[styles.hubAction, styles.hubActionAvailable]}
                testID="lesson-open-article"
              >
                <AppIcon name="info" color={palette.background} size={24} />
                <Text
                  style={[styles.hubActionText, styles.hubActionTextAvailable]}
                >
                  {articleLabels.open}
                </Text>
                <AppIcon name="forward" color={palette.background} size={20} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedLesson || busy }}
              disabled={!selectedLesson || busy}
              onPress={() => {
                if (selectedLesson)
                  controller.openLesson(
                    selectedLesson.id,
                    selectedLesson.readingState === 'completed',
                  );
              }}
              style={[
                styles.hubAction,
                selectedLesson
                  ? articleTechnique
                    ? styles.hubActionOutlined
                    : styles.hubActionAvailable
                  : styles.hubActionUnavailable,
              ]}
              testID="lesson-open-explanation"
            >
              <AppIcon
                name="play"
                color={
                  selectedLesson
                    ? articleTechnique
                      ? palette.accent
                      : palette.background
                    : palette.muted
                }
                size={24}
              />
              <Text
                style={[
                  styles.hubActionText,
                  selectedLesson
                    ? articleTechnique
                      ? styles.hubActionTextOutlined
                      : styles.hubActionTextAvailable
                    : styles.hubActionTextUnavailable,
                ]}
              >
                {copy.walkthrough}
              </Text>
              {selectedLesson ? (
                <AppIcon
                  name="forward"
                  color={articleTechnique ? palette.accent : palette.background}
                  size={20}
                />
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !practiceAvailable }}
              disabled={!practiceAvailable}
              onPress={() => setPracticeOpen(true)}
              style={[
                styles.hubAction,
                practiceAvailable
                  ? styles.hubActionOutlined
                  : styles.hubActionUnavailable,
              ]}
              testID={
                practiceAvailable
                  ? 'lesson-open-practice'
                  : 'lesson-practice-unavailable'
              }
            >
              <AppIcon
                name="pencil"
                color={practiceAvailable ? palette.accent : palette.muted}
                size={24}
              />
              <Text
                style={[
                  styles.hubActionText,
                  practiceAvailable
                    ? styles.hubActionTextOutlined
                    : styles.hubActionTextUnavailable,
                ]}
              >
                {copy.practice}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : lesson && reading?.location.chapter === 'intro' ? (
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
      ) : lesson && reading?.location.chapter === 'proof' && presentation ? (
        <View
          style={styles.playerFrame}
          pointerEvents={busy ? 'none' : 'auto'}
          accessibilityState={{ busy }}
        >
          <HintWalkthroughPlayer
            snapshot={lesson.example}
            presentation={presentation}
            fillBoardWidth={Boolean(lesson.pattern)}
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
            renderFooter={
              lesson.pattern
                ? undefined
                : () => (
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
                                    reading.location.target?.cell ===
                                      target.cell &&
                                    reading.location.target?.digit ===
                                      target.digit,
                                  disabled: busy,
                                }}
                                disabled={busy}
                                onPress={() => {
                                  controller.selectTarget(target);
                                }}
                                style={[
                                  styles.target,
                                  reading.location.target?.cell ===
                                    target.cell &&
                                    reading.location.target?.digit ===
                                      target.digit &&
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
                      {reading.location.pageIndex ===
                      presentation.pages.length - 1
                        ? button('lesson-show-recap', copy.toRecap, () =>
                            controller.showRecap(),
                          )
                        : null}
                    </View>
                  )
            }
            testID="lesson-walkthrough"
          />
        </View>
      ) : lesson && reading?.location.chapter === 'recap' ? (
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
      gap: 12,
      alignItems: 'center',
      flexDirection: 'row',
    },
    backButton: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
      minHeight: 44,
    },
    proofBackButton: { justifyContent: 'center', minWidth: 44 },
    backText: { color: palette.accent, fontSize: 14, fontWeight: '700' },
    heading: {
      color: palette.ink,
      fontSize: 20,
      fontWeight: '800',
      flexShrink: 1,
    },
    proofHeading: { flex: 1, fontSize: 17 },
    patternTabs: {
      flexDirection: 'row',
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 11,
      padding: 2,
    },
    patternTab: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 34,
      minWidth: 38,
      paddingHorizontal: 5,
      borderRadius: 8,
    },
    patternTabSelected: { backgroundColor: palette.accentSoft },
    patternTabText: { color: palette.muted, fontSize: 12, fontWeight: '700' },
    patternTabTextSelected: { color: palette.accent },
    content: {
      padding: 16,
      gap: 16,
      width: '100%',
      maxWidth: 740,
      alignSelf: 'center',
      paddingBottom: 40,
    },
    directoryContent: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 760,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 36,
    },
    directoryGroupWrap: { marginBottom: 22 },
    directoryGroupTitle: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 9,
      marginLeft: 15,
    },
    directoryGroup: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 16,
      overflow: 'hidden',
    },
    directoryRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 54,
      paddingHorizontal: 16,
      paddingVertical: 7,
      gap: 12,
    },
    directoryRowDivider: {
      borderBottomColor: palette.line,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    directoryRowText: {
      color: palette.ink,
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
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
      height: 64,
      width: 64,
      marginBottom: 4,
    },
    hubPatternSymbol: { height: 88, width: 88 },
    hubTitle: {
      color: palette.ink,
      fontSize: 26,
      fontWeight: '700',
      lineHeight: 34,
    },
    hubIntroduction: {
      color: palette.muted,
      fontSize: 16,
      lineHeight: 24,
    },
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
    hubActionUnavailable: {
      borderColor: palette.panelBorder,
      borderWidth: 1,
    },
    hubActionText: { flex: 1, fontSize: 16, fontWeight: '700' },
    hubActionTextAvailable: { color: palette.background },
    hubActionTextOutlined: { color: palette.accent },
    hubActionTextUnavailable: { color: palette.muted },
    articleContent: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 640,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 48,
      gap: 24,
    },
    articleTitle: {
      color: palette.ink,
      fontSize: 26,
      fontWeight: '700',
      lineHeight: 34,
    },
    articleDiagram: {
      alignItems: 'center',
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 16,
      gap: 4,
    },
    articlePatternTabs: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      gap: 8,
      marginBottom: 6,
    },
    articlePatternTab: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      minHeight: 40,
      borderColor: palette.line,
      borderWidth: 1,
      borderRadius: 10,
    },
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
    diagramCaption: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    articleSections: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 20,
    },
    articleSection: { paddingVertical: 18, gap: 7 },
    articleSectionDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.line,
    },
    articleSectionTitle: {
      color: palette.ink,
      fontSize: 17,
      fontWeight: '700',
      lineHeight: 24,
    },
    articleBody: { color: palette.muted, fontSize: 15, lineHeight: 23 },
    card: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
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
      color: palette.background,
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
    },
    secondaryButton: {
      backgroundColor: palette.panelSurface,
      borderWidth: 1,
      borderColor: palette.panelBorder,
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
