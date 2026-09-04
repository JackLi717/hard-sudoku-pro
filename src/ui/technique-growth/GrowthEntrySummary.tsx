import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { GrowthViewModel } from '../../application/technique-growth/contracts';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';
import { TechniqueGraphic } from './TechniqueGraphic';
import { featuredRecord, recordTag } from './entry-presentation';

export function GrowthSummary({
  vm,
  sessionId,
  onOpen,
}: {
  vm: GrowthViewModel;
  sessionId?: string;
  onOpen(): void;
}) {
  const { t, locale } = useLocalization();
  const { palette } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const session = vm.sessions.find(s => s.sessionId === sessionId);
  const recent = vm.profiles
    .flatMap(p => p.records)
    .filter(r => r.technique)
    .sort(
      (a, b) =>
        (b.occurredAt ?? -1) - (a.occurredAt ?? -1) || a.id.localeCompare(b.id),
    )[0];
  const record = sessionId ? featuredRecord(session?.records ?? []) : recent;
  const waiting =
    vm.loading ||
    (sessionId ? !session || session.coverage === 'pending' : vm.updating);
  const title = t(sessionId ? 'growth.entry.remember' : 'growth.title');
  const detail = record?.technique
    ? HINT_PRESENTATION_COPIES[locale].techniques[record.technique].name
    : t(
        vm.failed || session?.coverage === 'failed'
          ? 'growth.entry.failed'
          : waiting
          ? sessionId
            ? 'growth.entry.pending'
            : 'growth.updating'
          : sessionId
          ? 'growth.entry.empty'
          : 'growth.entry.start',
      );
  const label = record ? t(recordTag(record)) : null;
  const pending =
    sessionId && record && session?.coverage === 'pending'
      ? t('growth.entry.pending')
      : null;
  return (
    <Pressable
      testID={sessionId ? 'growth-result-summary' : 'growth-home-summary'}
      accessibilityRole="button"
      accessibilityLabel={[
        title,
        detail,
        label,
        pending,
        sessionId ? t('growth.entry.all') : t('growth.entry.recent'),
      ]
        .filter(Boolean)
        .join('. ')}
      onPress={onOpen}
      style={[styles.card, sessionId && styles.resultCard]}
    >
      <View style={[styles.row, fontScale > 1.2 && styles.largeRow]}>
        {record?.technique ? (
          <TechniqueGraphic code={record.technique} size={44} />
        ) : null}
        <View style={styles.copy}>
          <Text style={sessionId ? styles.eyebrow : styles.name}>{title}</Text>
          <Text style={sessionId ? styles.name : styles.meta}>
            {detail}
            {!sessionId && label ? ` · ${label}` : ''}
          </Text>
          {sessionId && label ? <Text style={styles.meta}>{label}</Text> : null}
        </View>
        {!sessionId ? (
          <Text accessible={false} style={styles.arrow}>
            ›
          </Text>
        ) : null}
      </View>
      {pending ? (
        <Text accessibilityLiveRegion="polite" style={styles.meta}>
          {pending}
        </Text>
      ) : null}
      {sessionId ? (
        <Text style={styles.link}>{t('growth.entry.all')} ›</Text>
      ) : null}
    </Pressable>
  );
}
const createStyles = (p: AppPalette) =>
  StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      padding: 18,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
      backgroundColor: p.surface,
      gap: 12,
      minHeight: 104,
    },
    resultCard: { marginTop: 18 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    largeRow: { flexWrap: 'wrap' },
    copy: { flex: 1, minWidth: 160, gap: 4 },
    eyebrow: { fontSize: 16, lineHeight: 23, color: p.muted },
    name: { fontSize: 20, lineHeight: 27, fontWeight: '700', color: p.ink },
    meta: { fontSize: 16, lineHeight: 23, color: p.muted },
    arrow: { fontSize: 24, lineHeight: 30, color: p.accent },
    link: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: p.accent },
  });
