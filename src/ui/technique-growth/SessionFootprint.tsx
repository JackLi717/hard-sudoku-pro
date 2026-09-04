import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { TechniqueGrowthController } from '../../application/technique-growth/controller';
import {
  GrowthRecord,
  GrowthReference,
  GrowthViewModel,
} from '../../application/technique-growth/contracts';
import { isLearning } from '../../application/technique-growth/view-model';
import { SessionReplaySource } from '../../application/game/session-replay-source';
import { TechniqueCode } from '../../domain/hints/techniques';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';
import { RecordBoard, TechniqueGraphic } from './TechniqueGraphic';
import { readRecordPreview, RecordPreview } from './record-preview';
import { featuredRecord, recordTag } from './entry-presentation';

type Filter = 'filterAll' | 'learning' | 'applications' | 'possible';
export function SessionFootprint({
  controller,
  vm,
  sessionId,
  source,
  hidden,
  onClose,
  onReplay,
  onDetail,
}: {
  controller: TechniqueGrowthController;
  vm: GrowthViewModel;
  sessionId: string;
  source?: SessionReplaySource;
  hidden: boolean;
  onClose(): void;
  onReplay(reference: GrowthReference): void;
  onDetail(code: TechniqueCode): void;
}) {
  const { t, locale } = useLocalization();
  const { palette } = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Filter>('filterAll');
  const [limits, setLimits] = useState<Partial<Record<Filter, number>>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<{
    id: string;
    value: RecordPreview | null;
    loading: boolean;
  } | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const initialOffset = useMemo(() => ({ ...offset.current }), []);
  const session = vm.sessions.find(s => s.sessionId === sessionId);
  const records = session?.records ?? [];
  const featured =
    records.find(r => r.id === selectedId) ?? featuredRecord(records);
  const referenceKey = featured ? JSON.stringify(featured.reference) : null;
  const featuredId = featured?.id;
  const previewKey = featuredId
    ? JSON.stringify([featuredId, referenceKey])
    : null;
  const active = !!session && ['active', 'paused'].includes(session.status);
  useEffect(() => {
    if (hidden) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => listener.remove();
  }, [hidden, onClose]);
  useEffect(() => {
    if (!source || !featured || active) {
      setPreviewState(null);
      return;
    }
    let live = true;
    setPreviewState({ id: previewKey!, value: null, loading: true });
    readRecordPreview(source, featured)
      .then(value => {
        if (live) setPreviewState({ id: previewKey!, value, loading: false });
      })
      .catch(() => {
        if (live)
          setPreviewState({ id: previewKey!, value: null, loading: false });
      });
    return () => {
      live = false;
    };
    // Re-read only when the saved source reference changes, not on VM refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, previewKey, active]);
  const preview = previewState?.id === previewKey ? previewState?.value : null;
  const previewLoading =
    previewState?.id === previewKey && previewState?.loading;
  const wide = width - 40 >= 620 && fontScale <= 1.2;
  const boardSize = Math.min(wide ? 264 : 224, width - 80);
  const name = (record: GrowthRecord) =>
    record.technique
      ? HINT_PRESENTATION_COPIES[locale].techniques[record.technique].name
      : t('growth.kind.unknown');
  const date = (at: number | null) =>
    at === null ? t('growth.unknownDate') : new Date(at).toLocaleString(locale);
  const toggle = (id: string) =>
    setExpanded(previous => ({ ...previous, [id]: !previous[id] }));
  const button = (label: string, action: () => void, primary = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={action}
      style={[styles.button, primary && styles.primary]}
    >
      <Text style={[styles.link, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
  const disclosure = (id: string, label: string, content: React.ReactNode) => (
    <View style={styles.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: !!expanded[id] }}
        onPress={() => toggle(id)}
        style={styles.disclosureButton}
      >
        <Text style={[styles.heading, styles.disclosureTitle]}>{label}</Text>
        <Text accessible={false} style={styles.chevron}>
          {expanded[id] ? '−' : '+'}
        </Text>
      </Pressable>
      {expanded[id] ? <View style={styles.evidence}>{content}</View> : null}
    </View>
  );
  const evidence = (record: GrowthRecord) => (
    <>
      <Text style={styles.body}>{t(`growth.kind.${record.kind}`)}</Text>
      <Text style={styles.meta}>{t(`growth.reason.${record.reason}`)}</Text>
      <Text style={styles.meta}>
        {t('growth.activityDate', { date: date(record.occurredAt) })}
      </Text>
      <Text style={styles.meta}>
        {t('growth.sourceDate', { date: date(session?.endedAt ?? null) })}
      </Text>
      {record.alternatives.length > 1 ? (
        <Text style={styles.meta}>
          {record.alternatives
            .map(code => HINT_PRESENTATION_COPIES[locale].techniques[code].name)
            .join(' · ')}
        </Text>
      ) : null}
    </>
  );
  const filtered = records.filter(
    r =>
      filter === 'filterAll' ||
      (filter === 'learning'
        ? isLearning(r)
        : filter === 'applications'
        ? r.kind === 'application'
        : !isLearning(r) && r.kind !== 'application'),
  );
  const limit = limits[filter] ?? 6;
  const waiting = !session || session.coverage === 'pending' || vm.loading;
  return (
    <View
      testID="growth-footprint"
      style={[styles.screen, hidden && styles.hidden]}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
    >
      <View style={styles.header}>
        {button(`‹ ${t('app.back')}`, onClose)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('growth.about')}
          accessibilityState={{ expanded: !!expanded.about }}
          onPress={() => toggle('about')}
          style={styles.infoButton}
        >
          <Text allowFontScaling={false} style={styles.info}>
            ⓘ
          </Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scroll}
        testID="growth-footprint-scroll"
        contentContainerStyle={styles.content}
        contentOffset={initialOffset}
        onScroll={event => {
          offset.current = event.nativeEvent.contentOffset;
        }}
        scrollEventThrottle={100}
      >
        <Text accessibilityRole="header" style={styles.title}>
          {t('growth.footprint')}
        </Text>
        {session ? (
          <Text style={styles.meta}>
            {t('growth.album.sourceLine', {
              date: new Date(session.endedAt).toLocaleDateString(locale),
              level: session.difficulty,
            })}
          </Text>
        ) : null}
        {expanded.about ? (
          <View style={styles.card}>
            <Text style={styles.body}>{t('growth.aboutBody')}</Text>
            <Text style={styles.meta}>
              {session
                ? t(`growth.coverage.${session.coverage}`)
                : t('growth.entry.pending')}
            </Text>
            {session ? (
              <Text style={styles.meta}>
                {t(
                  session.status === 'completed'
                    ? 'replay.statusCompleted'
                    : session.status === 'failed'
                    ? 'replay.statusFailed'
                    : session.status === 'abandoned'
                    ? 'replay.statusAbandoned'
                    : 'growth.activeNotice',
                )}
              </Text>
            ) : null}
          </View>
        ) : null}
        {vm.failed || session?.coverage === 'failed' ? (
          <View style={styles.notice}>
            <Text accessibilityLiveRegion="polite" style={styles.meta}>
              {t('growth.entry.failed')}
            </Text>
            {button(t('growth.retry'), () => {
              controller.retry().catch(() => undefined);
            })}
          </View>
        ) : waiting || vm.updating ? (
          <View style={styles.notice}>
            <ActivityIndicator color={palette.accent} />
            <Text accessibilityLiveRegion="polite" style={styles.meta}>
              {t(waiting ? 'growth.entry.pending' : 'growth.updating')}
            </Text>
          </View>
        ) : session?.coverage === 'incomplete' ? (
          <Text style={styles.meta}>{t('growth.entry.incomplete')}</Text>
        ) : null}
        {featured ? (
          <View style={styles.card}>
            <View style={styles.recordHeading}>
              {featured.technique ? (
                <TechniqueGraphic code={featured.technique} size={44} />
              ) : null}
              <View style={styles.copy}>
                <Text style={styles.eyebrow}>{t('growth.entry.fromGame')}</Text>
                <Text style={styles.recordName}>{name(featured)}</Text>
                <Text style={styles.tag}>{t(recordTag(featured))}</Text>
              </View>
            </View>
            <View style={[styles.previewRow, wide && styles.wide]}>
              <View style={styles.boardColumn}>
                {previewLoading ? (
                  <ActivityIndicator
                    style={{ width: boardSize, height: boardSize }}
                    color={palette.accent}
                  />
                ) : preview ? (
                  <RecordBoard
                    preview={preview}
                    size={boardSize}
                    label={t('growth.album.board', { step: preview.step })}
                  />
                ) : (
                  <Text style={styles.meta}>
                    {t(
                      active
                        ? 'growth.activeNotice'
                        : 'growth.album.unavailable',
                    )}
                  </Text>
                )}
                {preview ? (
                  <Text style={styles.meta}>
                    {t('growth.album.before', { step: preview.step })}
                  </Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                {!active
                  ? button(
                      t(
                        featured.reference.processId
                          ? 'growth.album.replayProcess'
                          : 'growth.album.replay',
                      ),
                      () => onReplay(featured.reference),
                      true,
                    )
                  : null}
                {disclosure(
                  'hero-source',
                  t('growth.album.source'),
                  evidence(featured),
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.recordName}>
              {t(waiting ? 'growth.entry.pendingTitle' : 'growth.entry.empty')}
            </Text>
            <Text style={styles.meta}>
              {t(
                waiting ? 'growth.entry.pendingBody' : 'growth.entry.emptyBody',
              )}
            </Text>
          </View>
        )}
        <View style={styles.listHeader}>
          <Text accessibilityRole="header" style={styles.heading}>
            {t('growth.filterAll')}
          </Text>
          <Text style={styles.meta}>
            {t('growth.entry.count', { count: records.length })}
          </Text>
        </View>
        {records.length ? (
          <View style={styles.tabs}>
            {(
              ['filterAll', 'learning', 'applications', 'possible'] as const
            ).map(value => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === value }}
                onPress={() => setFilter(value)}
                style={[styles.button, filter === value && styles.selected]}
              >
                <Text style={styles.link}>{t(`growth.${value}`)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {filtered.slice(0, limit).map(record => (
          <View key={record.id} style={styles.record}>
            <Pressable
              testID={`footprint-record-${record.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${name(record)}. ${t(recordTag(record))}`}
              accessibilityState={{ expanded: !!expanded[record.id] }}
              onPress={() => toggle(record.id)}
              style={styles.recordHeading}
            >
              {record.technique ? (
                <TechniqueGraphic code={record.technique} size={36} />
              ) : null}
              <View style={styles.copy}>
                <Text style={styles.heading}>{name(record)}</Text>
                <Text style={styles.meta}>{t(recordTag(record))}</Text>
              </View>
              <Text accessible={false} style={styles.chevron}>
                {expanded[record.id] ? '−' : '+'}
              </Text>
            </Pressable>
            {expanded[record.id] ? (
              <View style={styles.evidence}>
                {evidence(record)}
                {!active
                  ? button(
                      t(
                        record.reference.processId
                          ? 'growth.album.replayProcess'
                          : 'growth.album.replay',
                      ),
                      () => onReplay(record.reference),
                    )
                  : null}
                {button(t('growth.entry.preview'), () => {
                  setSelectedId(record.id);
                  scroll.current?.scrollTo({ y: 0, animated: false });
                })}
                {selectedId === record.id ? (
                  <Text accessibilityLiveRegion="polite" style={styles.meta}>
                    {t('growth.entry.previewAbove')}
                  </Text>
                ) : null}
                {record.technique
                  ? button(t('growth.album.technique'), () =>
                      onDetail(record.technique!),
                    )
                  : null}
              </View>
            ) : null}
          </View>
        ))}
        {records.length && !filtered.length ? (
          <Text style={styles.meta}>{t('growth.entry.noMatch')}</Text>
        ) : null}
        {filtered.length > limit
          ? button(
              t('growth.moreRecords', { count: filtered.length - limit }),
              () =>
                setLimits(previous => ({ ...previous, [filter]: limit + 10 })),
            )
          : null}
        {!active
          ? button(t('replay.title'), () =>
              onReplay({ sessionId, moveIds: [] }),
            )
          : null}
      </ScrollView>
    </View>
  );
}
const createStyles = (p: AppPalette) =>
  StyleSheet.create({
    screen: { flex: 1 },
    hidden: { display: 'none' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
    },
    content: {
      padding: 20,
      paddingTop: 8,
      paddingBottom: 40,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      gap: 14,
    },
    title: { fontSize: 32, lineHeight: 40, fontWeight: '800', color: p.ink },
    heading: { fontSize: 20, lineHeight: 27, fontWeight: '700', color: p.ink },
    recordName: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700',
      color: p.ink,
    },
    body: { fontSize: 17, lineHeight: 26, color: p.ink },
    meta: { fontSize: 16, lineHeight: 24, color: p.muted },
    eyebrow: { fontSize: 16, lineHeight: 23, color: p.muted },
    tag: { fontSize: 16, lineHeight: 24, color: p.accent },
    card: {
      padding: 18,
      gap: 18,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
      backgroundColor: p.surface,
    },
    record: {
      padding: 16,
      gap: 8,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
      backgroundColor: p.surface,
    },
    recordHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      minHeight: 64,
    },
    copy: { flex: 1, gap: 4 },
    button: {
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    link: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: p.accent },
    primary: { minHeight: 54, backgroundColor: p.accent },
    primaryText: { color: p.background, textAlign: 'center' },
    selected: { backgroundColor: p.accentSoft },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    infoButton: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: { fontSize: 27, color: p.accent },
    chevron: { fontSize: 24, lineHeight: 30, color: p.accent },
    disclosure: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
    },
    disclosureTitle: { flex: 1 },
    disclosureButton: {
      minHeight: 64,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    evidence: { gap: 10, paddingVertical: 10 },
    previewRow: { gap: 18 },
    wide: { flexDirection: 'row', alignItems: 'center' },
    boardColumn: { alignItems: 'center', gap: 10 },
    actions: { flex: 1, gap: 10 },
    notice: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
    },
    listHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 8,
    },
  });
