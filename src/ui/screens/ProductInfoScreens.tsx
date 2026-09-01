import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OfflineGameSnapshot } from '../../application';
import { TECHNIQUES, TechniqueCode } from '../../domain/hints/techniques';
import {
  HINT_PRESENTATION_COPIES,
  TranslationKey,
  useLocalization,
} from '../../localization';
import { AppPalette, useAppTheme } from '../theme';

type PageProps = {
  onBack(): void;
};

function PageHeader({ title, onBack }: PageProps & { title: string }) {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={onBack}>
        <Text style={styles.back}>‹ {t('app.back')}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.headerTitle}>
        {title}
      </Text>
    </View>
  );
}

function formatDuration(
  totalElapsedMs: number,
  t: ReturnType<typeof useLocalization>['t'],
) {
  const totalMinutes = Math.floor(totalElapsedMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? t('statistics.hoursMinutes', { hours, minutes })
    : t('statistics.minutes', { minutes });
}

export function StatisticsScreen({
  snapshot,
  onBack,
}: PageProps & { snapshot: OfflineGameSnapshot }): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const statistics = snapshot.statistics;
  const completionRate =
    statistics.attempts === 0
      ? 0
      : Math.round((statistics.completions / statistics.attempts) * 100);
  const metrics: readonly [TranslationKey, string | number][] = [
    ['statistics.attempts', statistics.attempts],
    ['statistics.completions', statistics.completions],
    ['statistics.completionRate', `${completionRate}%`],
    ['statistics.failures', statistics.failures],
    ['statistics.abandonments', statistics.abandonments],
    ['statistics.totalTime', formatDuration(statistics.totalElapsedMs, t)],
    ['statistics.hintsUsed', statistics.totalHintsUsed],
    ['statistics.quickPencilsUsed', statistics.totalQuickPencilsUsed],
  ];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageHeader onBack={onBack} title={t('statistics.title')} />
      <Text style={styles.subtitle}>{t('statistics.subtitle')}</Text>
      <View style={styles.metricGrid}>
        {metrics.map(([key, value]) => (
          <View
            accessible
            accessibilityLabel={`${t(key)}, ${value}`}
            key={key}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{t(key)}</Text>
          </View>
        ))}
      </View>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {t('statistics.byLevel')}
      </Text>
      {TECHNIQUES.filter(
        (technique, index, list) =>
          list.findIndex(item => item.level === technique.level) === index,
      ).map(({ level }) => (
        <View key={level} style={styles.rowCard}>
          <Text style={styles.rowTitle}>{t('home.level', { level })}</Text>
          <Text style={styles.rowValue}>
            {snapshot.completedByLevel[level]}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const HELP_TOPICS: readonly {
  title: TranslationKey;
  body: TranslationKey;
}[] = [
  { title: 'help.select.title', body: 'help.select.body' },
  { title: 'help.enter.title', body: 'help.enter.body' },
  { title: 'help.candidates.title', body: 'help.candidates.body' },
  { title: 'help.eraseUndo.title', body: 'help.eraseUndo.body' },
  { title: 'help.pause.title', body: 'help.pause.body' },
  { title: 'help.mistakes.title', body: 'help.mistakes.body' },
  { title: 'help.hints.title', body: 'help.hints.body' },
  { title: 'help.complete.title', body: 'help.complete.body' },
];

export function HelpScreen({ onBack }: PageProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageHeader onBack={onBack} title={t('help.title')} />
      <Text style={styles.subtitle}>{t('help.subtitle')}</Text>
      {HELP_TOPICS.map(topic => (
        <View key={topic.title} style={styles.infoCard}>
          <Text accessibilityRole="header" style={styles.infoTitle}>
            {t(topic.title)}
          </Text>
          <Text style={styles.infoBody}>{t(topic.body)}</Text>
        </View>
      ))}
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
  const styles = useMemo(() => createStyles(palette), [palette]);
  const copy = HINT_PRESENTATION_COPIES[locale];
  return (
    <ScrollView contentContainerStyle={styles.content}>
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
                <Text style={styles.chevron}>›</Text>
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
    <ScrollView contentContainerStyle={styles.content}>
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
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metricCard: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 16,
      borderWidth: 1,
      minHeight: 100,
      padding: 16,
      width: '48%',
    },
    metricValue: { color: palette.accent, fontSize: 24, fontWeight: '900' },
    metricLabel: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 6,
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
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
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
