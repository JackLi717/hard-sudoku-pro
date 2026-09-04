import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  FlatList,
  Modal,
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
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';
import { RecordBoard, TechniqueGraphic } from './TechniqueGraphic';
import {
  readSessionRecordDetails,
  SessionRecordDetails,
} from './record-preview';
import { formatRecordTime } from './record-time';
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
}: {
  controller: TechniqueGrowthController;
  vm: GrowthViewModel;
  sessionId: string;
  source?: SessionReplaySource;
  hidden: boolean;
  onClose(): void;
  onReplay(reference: GrowthReference): void;
}) {
  const { t, locale } = useLocalization();
  const { palette } = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Filter>('learning');
  const [now, setNow] = useState(Date.now);
  const [sourceRecord, setSourceRecord] = useState<GrowthRecord | null>(null);
  const [previewState, setPreviewState] = useState<{
    id: string;
    value: SessionRecordDetails;
    loading: boolean;
  } | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const initialOffset = useMemo(() => ({ ...offset.current }), []);
  const session = vm.sessions.find(s => s.sessionId === sessionId);
  const records = session?.records ?? [];
  const featured = featuredRecord(records);
  const previewKey = JSON.stringify([
    sessionId,
    records.map(record => [record.id, record.reference]),
  ]);
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
    if (hidden) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [hidden]);
  useEffect(() => {
    if (!source || !records.length || active) {
      setPreviewState(null);
      return;
    }
    let live = true;
    setPreviewState({ id: previewKey, value: {}, loading: true });
    readSessionRecordDetails(source, sessionId, records)
      .then(value => {
        if (live) setPreviewState({ id: previewKey, value, loading: false });
      })
      .catch(() => {
        if (live)
          setPreviewState({ id: previewKey, value: {}, loading: false });
      });
    return () => {
      live = false;
    };
    // Re-read only when the saved source reference changes, not on VM refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, previewKey, active]);
  const details = previewState?.id === previewKey ? previewState.value : {};
  const preview = featured ? details[featured.id]?.preview : null;
  const previewLoading =
    previewState?.id === previewKey && previewState?.loading;
  const stepPosition = (record: GrowthRecord) => {
    const position = details[record.id];
    if (!position)
      return previewLoading || active
        ? null
        : t('growth.footprint.stepMissing');
    return t('growth.footprint.stepPosition', {
      step:
        position.start === position.end
          ? position.start
          : `${position.start}–${position.end}`,
      total: position.total,
    });
  };
  const wide = width - 40 >= 620 && fontScale <= 1.2;
  const boardSize = Math.min(wide ? 264 : 224, width - 80);
  const name = (record: GrowthRecord) =>
    record.technique
      ? HINT_PRESENTATION_COPIES[locale].techniques[record.technique].name
      : t('growth.kind.unknown');
  const date = (at: number | null) => formatRecordTime(at, now, locale, t);
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
  const closePanel = () => {
    setSourceRecord(null);
  };
  const fact = (label: string, value: string) => (
    <View
      key={label}
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.factRow}
    >
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
  const facts = (record: GrowthRecord) => (
    <View style={styles.facts}>
      {record.technique
        ? fact(t('growth.footprint.technique'), name(record))
        : null}
      {fact(t('growth.footprint.type'), t(recordTag(record)))}
      {stepPosition(record)
        ? fact(t('growth.footprint.step'), stepPosition(record)!)
        : null}
      {fact(
        t('growth.footprint.activity'),
        record.occurredAt === null
          ? t('growth.footprint.missing')
          : date(record.occurredAt),
      )}
      {fact(
        t('growth.footprint.game'),
        session ? date(session.endedAt) : t('growth.footprint.missing'),
      )}
      {session
        ? fact(t('growth.footprint.level'), String(session.difficulty))
        : null}
      {record.alternatives.length > 1
        ? fact(
            t('growth.footprint.alternatives'),
            record.alternatives
              .map(
                code => HINT_PRESENTATION_COPIES[locale].techniques[code].name,
              )
              .join(' · '),
          )
        : null}
    </View>
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

      <FlatList
        style={styles.list}
        testID="growth-footprint-scroll"
        contentContainerStyle={styles.content}
        contentOffset={initialOffset}
        onScroll={event => {
          offset.current = event.nativeEvent.contentOffset;
        }}
        scrollEventThrottle={100}
        removeClippedSubviews={false}
        data={filtered}
        keyExtractor={record => record.id}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('growth.footprint')}
            </Text>
            {session ? (
              <Text style={styles.meta}>
                {t('growth.album.sourceLine', {
                  date: date(session.endedAt),
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
                <View style={[styles.recordHeading, styles.heroHeading]}>
                  {featured.technique ? (
                    <TechniqueGraphic code={featured.technique} size={44} />
                  ) : null}
                  <View style={styles.copy}>
                    <Text style={styles.eyebrow}>
                      {t('growth.entry.fromGame')}
                    </Text>
                    <Text style={styles.recordName}>{name(featured)}</Text>
                    <Text style={styles.tag}>
                      {[t(recordTag(featured)), stepPosition(featured)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
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
                        {t('growth.album.before', {
                          step: `${preview.step}/${
                            details[featured.id]!.total
                          }`,
                        })}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.actions, wide && styles.wideActions]}>
                    {!active
                      ? button(
                          t('growth.album.replayProcess'),
                          () => onReplay(featured.reference),
                          true,
                        )
                      : null}
                    {button(t('growth.footprint.source'), () =>
                      setSourceRecord(featured),
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.recordName}>
                  {t(
                    waiting
                      ? 'growth.entry.pendingTitle'
                      : 'growth.entry.empty',
                  )}
                </Text>
                <Text style={styles.meta}>
                  {t(
                    waiting
                      ? 'growth.entry.pendingBody'
                      : 'growth.entry.emptyBody',
                  )}
                </Text>
              </View>
            )}
            <View testID="footprint-toolbar" style={styles.toolbar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabs}
              >
                {(
                  ['filterAll', 'learning', 'applications', 'possible'] as const
                ).map(value => (
                  <Pressable
                    key={value}
                    testID={`footprint-filter-${value}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: filter === value }}
                    onPress={() => setFilter(value)}
                    style={[styles.tab, filter === value && styles.selected]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabLabel,
                        filter === value && styles.selectedLabel,
                      ]}
                    >
                      {t(`growth.footprint.${value}`)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.meta}>
                {t('growth.entry.count', { count: filtered.length })}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: record }) => (
          <View style={styles.record}>
            <Pressable
              testID={`footprint-record-${record.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${name(record)}. ${t(recordTag(record))}. ${
                stepPosition(record) ?? ''
              }. ${t('growth.album.replayProcess')}`}
              accessibilityState={{ disabled: active }}
              disabled={active}
              onPress={() => onReplay(record.reference)}
              style={styles.recordHeading}
            >
              {record.technique ? (
                <TechniqueGraphic code={record.technique} size={36} />
              ) : null}
              <View style={styles.copy}>
                <Text style={styles.heading}>{name(record)}</Text>
                <Text style={styles.meta}>
                  {[
                    record.technique ? t(recordTag(record)) : null,
                    stepPosition(record),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {!active ? (
                <Text accessible={false} style={styles.chevron}>
                  ↻
                </Text>
              ) : null}
            </Pressable>
            <Pressable
              testID={`footprint-source-${record.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${t('growth.footprint.source')}: ${name(
                record,
              )}`}
              onPress={() => setSourceRecord(record)}
              style={styles.sourceButton}
            >
              <Text allowFontScaling={false} style={styles.info}>
                ⓘ
              </Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          records.length ? (
            <Text style={styles.meta}>{t('growth.entry.noMatch')}</Text>
          ) : undefined
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {!active
              ? button(t('replay.title'), () =>
                  onReplay({ sessionId, moveIds: [] }),
                )
              : null}
            {filtered.length ? (
              <Text style={styles.end}>{t('growth.footprint.end')}</Text>
            ) : null}
          </View>
        }
      />
      <Modal
        transparent
        visible={!hidden && !!sourceRecord}
        onRequestClose={closePanel}
        animationType="none"
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('growth.footprint.close')}
            onPress={closePanel}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityViewIsModal style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text
                accessibilityRole="header"
                style={[styles.heading, styles.copy]}
              >
                {t('growth.footprint.source')}
              </Text>
              {button(t('growth.footprint.close'), closePanel)}
            </View>
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.panelContent}
            >
              {sourceRecord ? facts(sourceRecord) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
      padding: 12,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
      backgroundColor: p.surface,
    },
    recordHeading: {
      flex: 1,
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
    infoButton: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: { fontSize: 27, color: p.accent },
    chevron: { fontSize: 24, lineHeight: 30, color: p.accent },
    previewRow: { gap: 18 },
    wide: { flexDirection: 'row', alignItems: 'center' },
    boardColumn: { alignItems: 'center', gap: 10 },
    actions: { gap: 10 },
    notice: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
    },
    heroHeading: { flex: 0 },
    wideActions: { flex: 1 },
    list: { flex: 1 },
    intro: { gap: 14, marginBottom: 18 },
    toolbar: { gap: 12, marginTop: 6 },
    tabs: {
      flexGrow: 1,
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 14,
      backgroundColor: p.surface,
    },
    tab: {
      flexGrow: 1,
      flexShrink: 0,
      minWidth: 48,
      minHeight: 48,
      paddingHorizontal: 6,
      paddingVertical: 10,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabLabel: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      color: p.muted,
    },
    selectedLabel: { color: p.accent },
    sourceButton: {
      minWidth: 48,
      minHeight: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
    },
    footer: { gap: 12, paddingTop: 4 },
    end: {
      color: p.muted,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      paddingBottom: 8,
    },
    backdrop: {
      flex: 1,
      backgroundColor: p.overlay,
      justifyContent: 'center',
      padding: 20,
    },
    panel: {
      width: '100%',
      maxWidth: 680,
      maxHeight: '85%',
      alignSelf: 'center',
      borderRadius: 22,
      backgroundColor: p.surface,
      overflow: 'hidden',
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingLeft: 20,
      paddingRight: 8,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
    },
    panelContent: { padding: 16 },
    facts: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
      borderRadius: 14,
      overflow: 'hidden',
    },
    factRow: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
    },
    factLabel: {
      width: '34%',
      padding: 12,
      color: p.muted,
      fontSize: 16,
      lineHeight: 24,
      backgroundColor: p.background,
    },
    factValue: {
      flex: 1,
      padding: 12,
      color: p.ink,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
    },
  });
