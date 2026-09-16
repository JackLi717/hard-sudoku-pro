import { useScreenScroll } from '../screen-state';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OfflineGameSnapshot } from '../../application';
import { TECHNIQUES, TechniqueCode } from '../../domain/hints/techniques';
import {
  HINT_PRESENTATION_COPIES,
  TranslationKey,
  useLocalization,
} from '../../localization';
import { RootPageHeader } from '../components/RootPageHeader';
import { ROOT_PAGE } from '../root-page-design';
import { AppPalette, useAppTheme } from '../theme';
import { useAdaptiveLayout } from '../layout/adaptive-layout';
import {
  HowToPlayPreferencePatch,
  HowToPlayTutorial,
} from './HowToPlayTutorial';

type PageProps = {
  onBack(): void;
};

function PageHeader({ title, onBack }: PageProps & { title: string }) {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={t('app.back')}
        accessibilityRole="button"
        onPress={onBack}
      >
        <Text style={styles.back}>‹ {t('app.back')}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.headerTitle}>
        {title}
      </Text>
    </View>
  );
}

function formatStatisticsDuration(totalElapsedMs: number): string {
  const totalMinutes = Math.floor(totalElapsedMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function StatisticsScreen({
  snapshot,
  onBack,
}: {
  snapshot: OfflineGameSnapshot;
  onBack?(): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const { useLandscapeTabletLayout } = useAdaptiveLayout();
  const scroll = useScreenScroll('statistics');
  const styles = useMemo(() => createStyles(palette), [palette]);
  const statistics = snapshot.statistics;
  const completionRate =
    statistics.attempts === 0
      ? 0
      : Math.round((statistics.completions / statistics.attempts) * 100);
  const heroMetrics: readonly [TranslationKey, string | number][] = [
    ['statistics.completions', statistics.completions],
    ['statistics.completionRate', `${completionRate}%`],
    [
      'statistics.totalTime',
      formatStatisticsDuration(statistics.totalElapsedMs),
    ],
  ];
  const activityMetrics: readonly [TranslationKey, string | number][] = [
    ['statistics.attempts', statistics.attempts],
    ['statistics.abandonments', statistics.abandonments],
    ['statistics.failures', statistics.failures],
    ['statistics.hintsUsed', statistics.totalHintsUsed],
    ['statistics.quickPencilsUsed', statistics.totalQuickPencilsUsed],
  ];
  const levels = [1, 2, 3, 4, 5] as const;
  return (
    <ScrollView {...scroll} contentContainerStyle={styles.statisticsContent}>
      <RootPageHeader
        backLabel={t('app.back')}
        onBack={onBack}
        title={t('statistics.title')}
      />
      <View style={styles.statisticsBody}>
        <View style={styles.statisticsHero}>
          {heroMetrics.map(([key, value]) => (
            <View
              accessible
              accessibilityLabel={`${t(key)}, ${value}`}
              key={key}
              style={styles.statisticsHeroMetric}
              testID={`statistics-hero-${key}`}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={[
                  styles.statisticsHeroValue,
                  key === 'statistics.totalTime' && styles.statisticsHeroTime,
                ]}
              >
                {value}
              </Text>
              <Text style={styles.statisticsHeroLabel}>{t(key)}</Text>
            </View>
          ))}
        </View>
        <View
          style={[
            styles.statisticsSections,
            useLandscapeTabletLayout && styles.statisticsSectionsLandscape,
          ]}
          testID={
            useLandscapeTabletLayout
              ? 'statistics-landscape-layout'
              : 'statistics-portrait-layout'
          }
        >
          <View style={styles.statisticsSection}>
            <Text
              accessibilityRole="header"
              style={styles.statisticsSectionTitle}
            >
              {t('statistics.activity')}
            </Text>
            {activityMetrics.map(([key, value], index) => (
              <View
                accessible
                accessibilityLabel={`${t(key)}, ${value}`}
                key={key}
                style={[
                  styles.statisticsRow,
                  index === activityMetrics.length - 1 &&
                    styles.statisticsLastRow,
                ]}
                testID={`statistics-activity-${key}`}
              >
                <Text style={styles.statisticsRowLabel}>{t(key)}</Text>
                <Text style={styles.statisticsRowValue}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.statisticsSection}>
            <Text
              accessibilityRole="header"
              style={styles.statisticsSectionTitle}
            >
              {t('statistics.byLevel')}
            </Text>
            {levels.map((level, index) => (
              <View
                accessible
                accessibilityLabel={`${t('home.level', { level })}, ${
                  snapshot.completedByLevel[level]
                }`}
                key={level}
                style={[
                  styles.statisticsRow,
                  index === levels.length - 1 && styles.statisticsLastRow,
                ]}
                testID={`statistics-difficulty-${level}`}
              >
                <Text style={styles.statisticsRowLabel}>
                  {t('home.level', { level })}
                </Text>
                <Text style={styles.statisticsRowValue}>
                  {snapshot.completedByLevel[level]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export function HelpScreen({
  onBack,
  progress = 0,
  completed = false,
  onProgressChange,
  onStartLevelOne,
}: PageProps & {
  progress?: number;
  completed?: boolean;
  onProgressChange?(patch: HowToPlayPreferencePatch): void;
  onStartLevelOne?(): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [tutorialProgress, setTutorialProgress] = useState(progress);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(completed);

  const startTutorial = (fromProgress: number) => {
    const nextProgress = Math.max(1, fromProgress);
    setTutorialProgress(nextProgress);
    setTutorialCompleted(false);
    onProgressChange?.({
      howToPlayCompleted: false,
      howToPlayProgress: nextProgress,
    });
    setTutorialOpen(true);
  };

  if (tutorialOpen) {
    return (
      <HowToPlayTutorial
        initialProgress={tutorialProgress}
        onBack={() => setTutorialOpen(false)}
        onComplete={() => {
          setTutorialCompleted(true);
          setTutorialProgress(0);
          onProgressChange?.({
            howToPlayCompleted: true,
            howToPlayProgress: 0,
          });
        }}
        onProgress={nextProgress => {
          setTutorialProgress(nextProgress);
          onProgressChange?.({
            howToPlayCompleted: false,
            howToPlayProgress: nextProgress,
          });
        }}
        onStartLevelOne={onStartLevelOne}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageHeader onBack={onBack} title={t('help.title')} />
      <View style={styles.tutorialHero}>
        <Text style={styles.tutorialEyebrow}>
          {tutorialCompleted
            ? t('help.tutorial.completed')
            : t('help.tutorial.eyebrow')}
        </Text>
        <Text accessibilityRole="header" style={styles.tutorialTitle}>
          {t('help.tutorial.title')}
        </Text>
        <Text style={styles.tutorialBody}>{t('help.tutorial.body')}</Text>
        <View style={styles.tutorialPoints}>
          <Text style={styles.tutorialPoint}>
            ✓ {t('help.tutorial.point.rules')}
          </Text>
          <Text style={styles.tutorialPoint}>
            ✓ {t('help.tutorial.point.notes')}
          </Text>
          <Text style={styles.tutorialPoint}>
            ✓ {t('help.tutorial.point.undo')}
          </Text>
        </View>
        {tutorialProgress > 0 && !tutorialCompleted ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => startTutorial(tutorialProgress)}
              style={styles.tutorialPrimary}
            >
              <Text style={styles.tutorialPrimaryText}>
                {t('help.tutorial.continue')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => startTutorial(1)}
            >
              <Text style={styles.tutorialSecondary}>
                {t('help.tutorial.restart')}
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => startTutorial(1)}
            style={styles.tutorialPrimary}
          >
            <Text style={styles.tutorialPrimaryText}>
              {tutorialCompleted
                ? t('help.tutorial.restart')
                : t('help.tutorial.start')}
            </Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.helpFootnote}>{t('help.tutorial.footnote')}</Text>
    </ScrollView>
  );
}

type TechniqueOutcome = 'placement' | 'elimination' | 'both';

const PLACEMENT_TECHNIQUES = new Set<TechniqueCode>([
  'fullHouse',
  'nakedSingle',
  'hiddenSingle',
  'bugPlusOne',
]);
const BOTH_TECHNIQUES = new Set<TechniqueCode>([
  'aic',
  'groupedAic',
  'forcingChain',
  'forcingNet',
]);

function techniqueOutcome(code: TechniqueCode): TechniqueOutcome {
  if (PLACEMENT_TECHNIQUES.has(code)) {
    return 'placement';
  }
  return BOTH_TECHNIQUES.has(code) ? 'both' : 'elimination';
}

function genericRecognition(
  template: string,
  replacements: Readonly<{
    regions: string;
    premises: string;
    targetDigit: string;
  }>,
): string {
  return template
    .replaceAll('{regions}', replacements.regions)
    .replaceAll('{premises}', replacements.premises)
    .replaceAll('{targetDigit}', replacements.targetDigit);
}

export function TechniqueCatalogScreen({
  onBack,
  onOpenTechnique,
}: PageProps & {
  onOpenTechnique(code: TechniqueCode): void;
}): React.JSX.Element {
  const { locale, t } = useLocalization();
  const { palette } = useAppTheme();
  const scroll = useScreenScroll('academy');
  const styles = useMemo(() => createStyles(palette), [palette]);
  const copy = HINT_PRESENTATION_COPIES[locale];
  return (
    <ScrollView {...scroll} contentContainerStyle={styles.content}>
      <PageHeader onBack={onBack} title={t('techniques.title')} />
      <Text style={styles.subtitle}>{t('techniques.subtitle')}</Text>
      {[1, 2, 3, 4, 5].map(level => {
        const techniques = TECHNIQUES.filter(item => item.level === level);
        return (
          <View key={level}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {t('techniques.level', {
                level,
                count: techniques.length,
              })}
            </Text>
            {techniques.map(technique => (
              <Pressable
                accessibilityHint={t('techniques.openDetail')}
                accessibilityLabel={`${
                  copy.techniques[technique.code].name
                }, ${t('home.level', { level: technique.level })}`}
                accessibilityRole="button"
                key={technique.code}
                onPress={() => onOpenTechnique(technique.code)}
                style={({ pressed }) => [
                  styles.rowCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>
                    {copy.techniques[technique.code].name}
                  </Text>
                  <Text style={styles.code}>{technique.code}</Text>
                </View>
                <Text allowFontScaling={false} style={styles.chevron}>
                  ›
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

export function TechniqueDetailScreen({
  code,
  onBack,
}: PageProps & { code: TechniqueCode }): React.JSX.Element {
  const { locale, t } = useLocalization();
  const { palette } = useAppTheme();
  const scroll = useScreenScroll(`academy:${code}`);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const technique = TECHNIQUES.find(item => item.code === code);
  if (!technique) {
    return (
      <TechniqueCatalogScreen
        onBack={onBack}
        onOpenTechnique={() => undefined}
      />
    );
  }
  const template = HINT_PRESENTATION_COPIES[locale].techniques[code];
  const outcome = techniqueOutcome(code);
  const outcomeKey: TranslationKey = `techniques.outcome.${outcome}`;
  const goalKey: TranslationKey = `techniques.goal.${outcome}`;
  return (
    <ScrollView {...scroll} contentContainerStyle={styles.content}>
      <PageHeader onBack={onBack} title={template.name} />
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>
          {t('home.level', { level: technique.level })}
        </Text>
        <Text style={styles.badge}>{t(outcomeKey)}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text accessibilityRole="header" style={styles.infoTitle}>
          {t('techniques.goal')}
        </Text>
        <Text style={styles.infoBody}>{t(goalKey)}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text accessibilityRole="header" style={styles.infoTitle}>
          {t('techniques.recognition')}
        </Text>
        <Text style={styles.infoBody}>
          {genericRecognition(template.observe, {
            regions: t('techniques.genericRegions'),
            premises: t('techniques.genericCandidates'),
            targetDigit: t('techniques.genericDigit'),
          })}
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Text accessibilityRole="header" style={styles.infoTitle}>
          {t('techniques.result')}
        </Text>
        <Text style={styles.infoBody}>{t(outcomeKey)}</Text>
      </View>
      <Text style={styles.codeLabel}>{t('techniques.code')}</Text>
      <Text selectable style={styles.codeValue}>
        {code}
      </Text>
    </ScrollView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    statisticsContent: { paddingBottom: 40 },
    statisticsBody: {
      alignSelf: 'center',
      maxWidth: ROOT_PAGE.contentMaxWidth,
      paddingHorizontal: ROOT_PAGE.contentHorizontalInset,
      paddingTop: 26,
      width: '100%',
    },
    statisticsHero: { flexDirection: 'row' },
    statisticsSections: {},
    statisticsSectionsLandscape: { flexDirection: 'row', gap: 40 },
    statisticsSection: { flex: 1, minWidth: 0 },
    statisticsHeroMetric: {
      alignItems: 'center',
      flex: 1,
      paddingHorizontal: 3,
    },
    statisticsHeroValue: {
      color: palette.accent,
      fontSize: 28,
      fontWeight: '800',
      textAlign: 'center',
      width: '100%',
    },
    statisticsHeroTime: { fontSize: 22 },
    statisticsHeroLabel: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 5,
      textAlign: 'center',
    },
    statisticsSectionTitle: {
      color: palette.ink,
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 8,
      marginTop: 32,
    },
    statisticsRow: {
      alignItems: 'center',
      borderBottomColor: palette.line,
      borderBottomWidth: ROOT_PAGE.dividerWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 48,
      paddingVertical: 11,
    },
    statisticsLastRow: { borderBottomWidth: 0 },
    statisticsRowLabel: { color: palette.ink, flex: 1, fontSize: 15 },
    statisticsRowValue: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '700',
      marginLeft: 12,
    },
    content: { paddingBottom: 40, paddingHorizontal: 20, paddingTop: 18 },
    header: { alignItems: 'flex-start', marginBottom: 18 },
    back: { color: palette.accent, fontSize: 15, fontWeight: '800' },
    headerTitle: {
      color: palette.ink,
      fontSize: 22,
      fontWeight: '800',
      marginTop: 12,
    },
    subtitle: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 22,
    },
    tutorialHero: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 20,
      borderWidth: 1,
      padding: 22,
    },
    tutorialEyebrow: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
    },
    tutorialTitle: {
      color: palette.ink,
      fontSize: 24,
      fontWeight: '900',
      marginTop: 10,
    },
    tutorialBody: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 9,
    },
    tutorialPoints: { gap: 9, marginTop: 20 },
    tutorialPoint: { color: palette.ink, fontSize: 14, fontWeight: '600' },
    tutorialPrimary: {
      backgroundColor: palette.accent,
      borderRadius: 13,
      marginTop: 24,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    tutorialPrimaryText: {
      color: palette.white,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
    },
    tutorialSecondary: {
      color: palette.accent,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 17,
      textAlign: 'center',
    },
    helpFootnote: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 16,
      textAlign: 'center',
    },
    sectionTitle: {
      color: palette.ink,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 10,
      marginTop: 24,
    },
    rowCard: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 9,
      minHeight: 64,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    rowCopy: { flex: 1 },
    rowTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
    rowValue: { color: palette.accent, fontSize: 20, fontWeight: '900' },
    code: { color: palette.muted, fontSize: 11, marginTop: 3 },
    chevron: { color: palette.muted, fontSize: 26, marginLeft: 12 },
    pressed: { opacity: 0.68 },
    infoCard: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: 16,
      marginBottom: 12,
      padding: 18,
    },
    infoTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' },
    infoBody: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 7,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 18,
    },
    badge: {
      backgroundColor: palette.accentSoft,
      borderRadius: 999,
      color: palette.accent,
      fontSize: 12,
      fontWeight: '800',
      overflow: 'hidden',
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    codeLabel: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 8,
    },
    codeValue: { color: palette.ink, fontSize: 14, marginTop: 4 },
  });
}
