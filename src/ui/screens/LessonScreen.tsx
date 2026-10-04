import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BasicLessonScreen } from './BasicLessonScreen';
import { TermConceptScreen } from './TermConceptScreen';
import {
  PREMIUM_TERM_CONCEPTS,
  TERM_CONCEPT_PLACEMENTS,
  type TermConcept,
} from '../../data/lessons/term-concepts';
import { PRE_RELEASE_TERM_COURSES_OPEN } from '../../app/release-scope';
import {
  BASIC_COURSES,
  BASIC_LESSON_COPY,
  type BasicCourse,
} from '../../localization/basic-lesson-copy';
import { LessonController } from '../../application/lessons/lesson-controller';
import type { ProductPreferences } from '../../application/app/product-preferences';
import { supportsPracticeTechnique } from '../../application/practice/practice-evaluator';
import type { PracticeProgressStore } from '../../domain/practice/progress';
import type { LessonReadingStore } from '../../domain/lessons/reading';
import {
  bundledPracticeRepository,
  type PracticeRepository,
} from '../../data/practice/practice-catalog';
import { TECHNIQUES, TechniqueCode } from '../../domain/hints/techniques';
import { requiresPremiumCourse } from '../../domain/lessons/course-access';
import { useLocalization, HINT_PRESENTATION_COPIES } from '../../localization';
import { LESSON_COPY } from '../../localization/lesson-copy';
import {
  TERM_CONCEPT_COPY,
  TERM_CONCEPT_UI,
} from '../../localization/term-concept-copy';
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

// Published Level 4 courses use subgroups; Level 5 techniques share one group.
const LEVEL_FOUR_GROUPS = [
  {
    title: 'fishGroup',
    techniques: ['swordfish', 'finnedXWing', 'sashimiXWing'],
  },
  {
    title: 'shortChainGroup',
    techniques: ['skyscraper', 'twoStringKite', 'emptyRectangle', 'turbotFish'],
  },
  { title: 'wingGroup', techniques: ['xyWing', 'xyzWing', 'wWing'] },
  {
    title: 'coloringGroup',
    techniques: ['simpleColoring', 'multiColoring', 'remotePair'],
  },
  {
    title: 'uniquenessGroup',
    techniques: [
      'uniqueRectangle',
      'uniqueRectangleType4',
      'hiddenRectangle',
      'avoidableRectangle',
      'bugPlusOne',
    ],
  },
] as const;

export function LessonScreen({
  controller,
  directoryPosition,
  onClose,
  preferences,
  practiceProgress,
  practiceAccess,
  premium,
  coursePreview = PRE_RELEASE_TERM_COURSES_OPEN,
  initialTechnique,
  initialTermCourse,
  onOpenPremium,
  onOpenPremiumTermCourse,
  onUnlockPractice,
  practiceRepository = bundledPracticeRepository,
}: {
  controller: LessonController;
  directoryPosition?: LessonReadingStore;
  onClose(): void;
  preferences?: ProductPreferences;
  practiceProgress?: PracticeProgressStore;
  practiceAccess?: import('../../domain/practice/access').PracticeAccessStore;
  premium?: boolean;
  coursePreview?: boolean;
  initialTechnique?: TechniqueCode;
  initialTermCourse?: TermConcept;
  onOpenPremium?: (technique: TechniqueCode) => void;
  onOpenPremiumTermCourse?: (course: TermConcept) => void;
  onUnlockPractice?: (
    technique: TechniqueCode,
    total: number,
  ) => Promise<
    | { status: 'unlocked'; unlockedBatches: number }
    | { status: 'dismissed' }
    | { status: 'unavailable'; reason: string }
    | { status: 'failed'; errorCode: string }
  >;
  practiceRepository?: PracticeRepository;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const copy = LESSON_COPY[locale];
  const basicCopy = BASIC_LESSON_COPY[locale];
  const termCopy = TERM_CONCEPT_COPY[locale];
  const termUi = TERM_CONCEPT_UI[locale];
  const [basicCourse, setBasicCourse] = useState<BasicCourse | null>(null);
  const [termCourse, setTermCourse] = useState<TermConcept | null>(
    initialTermCourse &&
      (coursePreview ||
        premium ||
        !PREMIUM_TERM_CONCEPTS.has(initialTermCourse))
      ? initialTermCourse
      : null,
  );
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const techniqueNames = (
    techniques: readonly TechniqueCode[],
    interactive = false,
  ) =>
    techniques.map((code, index) => {
      const style = [
        styles.directoryRow,
        index < techniques.length - 1 && styles.directoryRowDivider,
      ];
      const name = HINT_PRESENTATION_COPIES[locale].techniques[code].name;
      const locked = requiresPremiumCourse(code) && !premium;
      return interactive ? (
        <Pressable
          key={code}
          accessibilityRole="button"
          onPress={() => {
            if (locked) {
              onOpenPremium?.(code);
              return;
            }
            setArticleOpen(false);
            setSelectedTechnique(code);
          }}
          style={style}
          testID={`lesson-technique-${code}`}
        >
          <Text style={styles.directoryRowText}>{name}</Text>
          {locked ? <Text style={styles.premiumTag}>Premium</Text> : null}
          <AppIcon name="forward" color={palette.muted} size={20} />
        </Pressable>
      ) : (
        <View key={code} style={style} testID={`lesson-technique-${code}`}>
          <Text style={styles.directoryRowText}>{name}</Text>
        </View>
      );
    });
  const termNames = (courses: readonly TermConcept[]) =>
    courses.map((course, index) => {
      const locked =
        PREMIUM_TERM_CONCEPTS.has(course) && !premium && !coursePreview;
      return (
        <Pressable
          key={course}
          accessibilityRole="button"
          onPress={() => {
            if (locked) onOpenPremiumTermCourse?.(course);
            else setTermCourse(course);
          }}
          style={[
            styles.directoryRow,
            index < courses.length - 1 && styles.directoryRowDivider,
          ]}
          testID={`term-course-${course}`}
        >
          <Text style={styles.directoryRowText}>{termCopy[course].title}</Text>
          {locked ? <Text style={styles.premiumTag}>Premium</Text> : null}
          <AppIcon name="forward" color={palette.muted} size={20} />
        </Pressable>
      );
    });
  const termGroup = (courses: readonly TermConcept[], id: string) => (
    <View style={styles.directorySubgroup} testID={id}>
      <Text accessibilityRole="header" style={styles.directorySubgroupTitle}>
        {termUi.group}
      </Text>
      <View style={styles.directoryGroup}>{termNames(courses)}</View>
    </View>
  );
  const [snapshot, setSnapshot] = useState(controller.snapshot);
  const directoryScrollRef =
    useRef<React.ComponentRef<typeof ScrollView>>(null);
  const directoryOffsetRef = useRef(0);
  const restoreDirectoryRef = useRef(true);
  const [directoryPositionReady, setDirectoryPositionReady] = useState(
    !directoryPosition?.readDirectoryOffset,
  );
  useEffect(() => {
    if (!directoryPosition?.readDirectoryOffset) return;
    let active = true;
    directoryPosition
      .readDirectoryOffset()
      .then(offset => {
        if (active) {
          directoryOffsetRef.current =
            Number.isFinite(offset) && offset >= 0 ? offset : 0;
          restoreDirectoryRef.current = true;
          setDirectoryPositionReady(true);
        }
      })
      .catch(() => {
        if (active) setDirectoryPositionReady(true);
      });
    return () => {
      active = false;
    };
  }, [directoryPosition]);
  const saveDirectoryPosition = useCallback(() => {
    const write = directoryPosition?.saveDirectoryOffset?.(
      directoryOffsetRef.current,
    );
    write?.catch(() => undefined);
  }, [directoryPosition]);
  const exitDirectory = useCallback(() => {
    saveDirectoryPosition();
    onClose();
  }, [onClose, saveDirectoryPosition]);
  const [selectedTechnique, setSelectedTechnique] =
    useState<TechniqueCode | null>(
      initialTechnique && (premium || !requiresPremiumCourse(initialTechnique))
        ? initialTechnique
        : null,
    );
  const [articleOpen, setArticleOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const accessibleTechnique =
    selectedTechnique && (premium || !requiresPremiumCourse(selectedTechnique))
      ? selectedTechnique
      : null;
  const practiceAvailable =
    accessibleTechnique !== null &&
    supportsPracticeTechnique(accessibleTechnique) &&
    practiceRepository.list(accessibleTechnique, 'exercise').length > 0;
  const [articlePattern, setArticlePattern] = useState<TechniquePattern>('row');
  useEffect(() => {
    if (
      termCourse &&
      !coursePreview &&
      !premium &&
      PREMIUM_TERM_CONCEPTS.has(termCourse)
    ) {
      setTermCourse(null);
    }
  }, [coursePreview, premium, termCourse]);
  useEffect(() => {
    setSnapshot(controller.snapshot);
    const unsubscribe = controller.subscribe(setSnapshot);
    controller.initialize();
    return unsubscribe;
  }, [controller]);
  useEffect(() => {
    if (
      selectedTechnique &&
      !premium &&
      requiresPremiumCourse(selectedTechnique)
    ) {
      controller.back();
      setPracticeOpen(false);
      setArticleOpen(false);
      setSelectedTechnique(null);
    }
  }, [controller, premium, selectedTechnique]);
  const back = () => {
    if (termCourse) {
      setTermCourse(null);
      return;
    }
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
    else exitDirectory();
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (basicCourse) return false;
        if (termCourse) return false;
        if (practiceOpen) {
          setPracticeOpen(false);
          return true;
        }
        if (!controller.back()) {
          if (articleOpen) setArticleOpen(false);
          else if (selectedTechnique) setSelectedTechnique(null);
          else exitDirectory();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [
    articleOpen,
    basicCourse,
    controller,
    exitDirectory,
    practiceOpen,
    selectedTechnique,
    termCourse,
  ]);

  const { reading, presentation, busy } = snapshot;
  const lesson =
    snapshot.lesson?.techniqueCode === accessibleTechnique
      ? snapshot.lesson
      : null;
  const technique = TECHNIQUES.find(item => item.code === accessibleTechnique);
  const selectedLesson = snapshot.lessons.find(
    item => item.techniqueCode === accessibleTechnique,
  );
  const patternLessons = snapshot.lessons
    .filter(item => item.techniqueCode === accessibleTechnique && item.pattern)
    .sort(
      (a, b) =>
        (
          ARTICLE_PATTERN_VARIANTS[
            accessibleTechnique as keyof typeof ARTICLE_PATTERN_VARIANTS
          ] as readonly string[]
        ).indexOf(a.pattern!) -
        (
          ARTICLE_PATTERN_VARIANTS[
            accessibleTechnique as keyof typeof ARTICLE_PATTERN_VARIANTS
          ] as readonly string[]
        ).indexOf(b.pattern!),
    );
  const showPatternTabs =
    lesson?.pattern &&
    reading?.location.chapter === 'proof' &&
    patternLessons.length > 1;
  const articleTechnique = ARTICLE_TECHNIQUES.find(
    code => code === accessibleTechnique,
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
  const directoryOpen = !lesson && !accessibleTechnique;
  const directoryVisible =
    directoryOpen &&
    snapshot.ready &&
    directoryPositionReady &&
    !basicCourse &&
    !termCourse &&
    !practiceOpen;
  useLayoutEffect(() => {
    if (!directoryVisible) restoreDirectoryRef.current = true;
  }, [directoryVisible]);
  const title = !lesson
    ? accessibleTechnique
      ? null
      : copy.title
    : reading?.location.chapter === 'intro'
    ? copy.intro
    : reading?.location.chapter === 'proof'
    ? lesson.title
    : copy.recap;
  const backLabel = lesson
    ? accessibleTechnique
      ? copy.backToTechnique
      : copy.directory
    : articleOpen
    ? copy.backToTechnique
    : accessibleTechnique
    ? copy.directory
    : copy.close;
  if (basicCourse) {
    return (
      <BasicLessonScreen
        course={basicCourse}
        onClose={() => setBasicCourse(null)}
      />
    );
  }
  if (termCourse) {
    return (
      <TermConceptScreen
        key={termCourse}
        concept={termCourse}
        onClose={() => setTermCourse(null)}
      />
    );
  }
  if (practiceOpen && accessibleTechnique && practiceAvailable) {
    return (
      <TechniquePracticeScreen
        key={accessibleTechnique}
        technique={accessibleTechnique}
        onClose={() => setPracticeOpen(false)}
        preferences={preferences}
        practiceProgress={practiceProgress}
        practiceAccess={practiceAccess}
        premium={premium}
        onUnlockPractice={onUnlockPractice}
        practiceRepository={practiceRepository}
      />
    );
  }
  return (
    <View style={styles.screen} testID="lesson-screen">
      <View style={styles.header} testID="lesson-navigation">
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
        {title && !directoryOpen ? (
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
      {directoryOpen ? (
        <Text
          accessibilityRole="header"
          style={styles.directoryTitle}
          testID="lesson-directory-title"
        >
          {copy.title}
        </Text>
      ) : null}
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
      {!snapshot.ready || !directoryPositionReady ? (
        <Text style={styles.notice}>
          {busy || !directoryPositionReady ? copy.loading : ''}
        </Text>
      ) : !lesson && !technique ? (
        <ScrollView
          ref={directoryScrollRef}
          contentOffset={{ x: 0, y: directoryOffsetRef.current }}
          onScroll={event => {
            if (!restoreDirectoryRef.current) {
              directoryOffsetRef.current = Math.max(
                0,
                event.nativeEvent.contentOffset.y,
              );
            }
          }}
          onScrollEndDrag={saveDirectoryPosition}
          onMomentumScrollEnd={saveDirectoryPosition}
          onContentSizeChange={() => {
            if (restoreDirectoryRef.current) {
              directoryScrollRef.current?.scrollTo({
                y: directoryOffsetRef.current,
                animated: false,
              });
              restoreDirectoryRef.current = false;
            }
          }}
          scrollEventThrottle={32}
          contentContainerStyle={styles.directoryContent}
          testID="lesson-directory"
        >
          <View style={styles.directoryGroupWrap} testID="lesson-basics">
            <Text style={styles.directoryGroupTitle}>{basicCopy.group}</Text>
            <View style={styles.directoryGroup}>
              {BASIC_COURSES.map((course, index) => (
                <Pressable
                  key={course}
                  accessibilityRole="button"
                  onPress={() => setBasicCourse(course)}
                  style={[
                    styles.directoryRow,
                    index < BASIC_COURSES.length - 1 &&
                      styles.directoryRowDivider,
                  ]}
                  testID={`lesson-basic-${course}`}
                >
                  <Text style={styles.directoryRowText}>
                    {basicCopy.titles[course]}
                  </Text>
                  <AppIcon name="forward" color={palette.muted} size={20} />
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.directoryGroupWrap} testID="lesson-terms-basics">
            {termGroup(TERM_CONCEPT_PLACEMENTS.basics, 'lesson-core-basics')}
          </View>
          {([1, 2, 3] as const).map(level => (
            <View
              key={level}
              style={styles.directoryGroupWrap}
              testID={`lesson-level-${level}`}
            >
              <Text style={styles.directoryGroupTitle}>Level {level}</Text>
              {level === 2
                ? termGroup(
                    TERM_CONCEPT_PLACEMENTS.level2,
                    'lesson-core-level-2',
                  )
                : null}
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
          <View style={styles.directoryGroupWrap} testID="lesson-level-4">
            <Text accessibilityRole="header" style={styles.directoryGroupTitle}>
              Level 4
            </Text>
            {LEVEL_FOUR_GROUPS.map(group => (
              <View
                key={group.title}
                style={styles.directorySubgroup}
                testID={`lesson-level-4-${group.title}`}
              >
                <Text
                  accessibilityRole="header"
                  style={styles.directorySubgroupTitle}
                >
                  {copy[group.title]}
                </Text>
                {group.title === 'fishGroup'
                  ? termGroup(TERM_CONCEPT_PLACEMENTS.fish, 'lesson-core-fish')
                  : group.title === 'shortChainGroup'
                  ? termGroup(
                      TERM_CONCEPT_PLACEMENTS.shortChain,
                      'lesson-core-short-chain',
                    )
                  : group.title === 'coloringGroup'
                  ? termGroup(
                      TERM_CONCEPT_PLACEMENTS.coloring,
                      'lesson-core-coloring',
                    )
                  : group.title === 'uniquenessGroup'
                  ? termGroup(
                      TERM_CONCEPT_PLACEMENTS.uniqueness,
                      'lesson-core-uniqueness',
                    )
                  : null}
                <View style={styles.directoryGroup}>
                  {techniqueNames(
                    group.techniques,
                    group.title === 'fishGroup' ||
                      group.title === 'shortChainGroup' ||
                      group.title === 'wingGroup' ||
                      group.title === 'coloringGroup' ||
                      group.title === 'uniquenessGroup',
                  )}
                </View>
              </View>
            ))}
          </View>
          <View style={styles.directoryGroupWrap} testID="lesson-level-5">
            <Text accessibilityRole="header" style={styles.directoryGroupTitle}>
              Level 5
            </Text>
            {termGroup(TERM_CONCEPT_PLACEMENTS.level5, 'lesson-core-level-5')}
            <View style={styles.directoryGroup} testID="lesson-level-5-card">
              {techniqueNames(
                TECHNIQUES.filter(item => item.level === 5).map(
                  item => item.code,
                ),
                true,
              )}
            </View>
          </View>
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
    directoryTitle: {
      color: palette.ink,
      fontSize: 26,
      lineHeight: 34,
      fontWeight: '700',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
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
    directorySubgroup: { marginTop: 12 },
    directorySubgroupTitle: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 9,
      marginHorizontal: 15,
    },
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
    premiumTag: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '700',
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
