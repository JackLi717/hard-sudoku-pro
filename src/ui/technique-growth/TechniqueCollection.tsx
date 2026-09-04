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
  GrowthProfile,
  GrowthRecord,
  GrowthReference,
  GrowthViewModel,
} from '../../application/technique-growth/contracts';
import {
  growthWindows,
  isLearning,
} from '../../application/technique-growth/view-model';
import { SessionReplaySource } from '../../application/game/session-replay-source';
import { TechniqueCode } from '../../domain/hints/techniques';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';
import { RecordBoard, TechniqueGraphic } from './TechniqueGraphic';
import { readRecordPreview, RecordPreview } from './record-preview';

type Filter = 'filterAll' | 'learning' | 'applications' | 'possible';
type Tab = 'recent' | 'followed' | 'all';
const category = (record: GrowthRecord) =>
  isLearning(record)
    ? 'learning'
    : record.kind === 'application'
    ? 'application'
    : record.kind === 'possible'
    ? 'possible'
    : null;
const profileCategory = (profile: GrowthProfile) =>
  profile.applications
    ? 'growth.album.application'
    : profile.learningSessions
    ? 'growth.album.learning'
    : profile.status === 'possible'
    ? 'growth.album.possible'
    : (`growth.state.${profile.status}` as const);

export function TechniqueCollection({
  controller,
  vm,
  source,
  initialCode,
  onClose,
  onReplay,
  onStart,
  hidden,
}: {
  controller: TechniqueGrowthController;
  vm: GrowthViewModel;
  source?: SessionReplaySource;
  initialCode?: TechniqueCode;
  onClose(): void;
  onReplay(ref: GrowthReference): void;
  onStart(): void;
  hidden: boolean;
}) {
  const { t, locale } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width, height, fontScale } = useWindowDimensions();
  const [code, setCode] = useState<TechniqueCode | undefined>(initialCode);
  const [tab, setTab] = useState<Tab>('recent');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<Record<string, Filter>>({});
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [previewState, setPreviewState] = useState<{
    id: string;
    value: RecordPreview | null;
    loading: boolean;
  } | null>(null);
  const [followError, setFollowError] = useState(false);
  const offsets = useRef<Record<string, number>>({});
  const pageKey = code ?? `overview:${tab}`;
  // Only restore when navigating. Re-rendering must not force a scroll offset.
  const initialOffset = useMemo(
    () => ({ x: 0, y: offsets.current[pageKey] ?? 0 }),
    [pageKey],
  );
  const back = () => (code && !initialCode ? setCode(undefined) : onClose());
  useEffect(() => {
    if (hidden) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => listener.remove();
  });
  const profile = vm.profiles.find(p => p.technique === code);
  const latest = useMemo(
    () =>
      profile
        ? [...profile.records].sort(
            (a, b) => (b.occurredAt ?? -1) - (a.occurredAt ?? -1),
          )[0]
        : undefined,
    [profile],
  );
  const latestId = latest?.id;
  useEffect(() => {
    if (!source || !latest) {
      setPreviewState(null);
      return;
    }
    let live = true;
    setPreviewState({ id: latest.id, value: null, loading: true });
    readRecordPreview(source, latest)
      .then(value => {
        if (live) setPreviewState({ id: latest.id, value, loading: false });
      })
      .catch(() => {
        if (live)
          setPreviewState({ id: latest.id, value: null, loading: false });
      });
    return () => {
      live = false;
    };
    // A VM refresh with the same immutable record must not reread the database.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, latestId]);
  const preview =
    previewState && previewState.id === latestId ? previewState.value : null;
  const loadingPreview =
    previewState && previewState.id === latestId && previewState.loading;
  const availableWidth = Math.min(width - 40, 720);
  const columns =
    fontScale > 1.2 || Math.min(width, height) < 600
      ? 1
      : availableWidth >= 620
      ? 3
      : 2;
  const wideDetail = availableWidth >= 620 && fontScale <= 1.2;
  const boardSize = Math.max(
    180,
    Math.min(wideDetail ? 288 : availableWidth - 36, wideDetail ? 288 : 248),
  );
  const name = (technique: TechniqueCode) =>
    HINT_PRESENTATION_COPIES[locale].techniques[technique].name;
  const date = (at: number | null) =>
    at === null
      ? t('growth.unknownDate')
      : new Date(at).toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  const dateTime = (at: number | null) =>
    at === null ? t('growth.unknownDate') : new Date(at).toLocaleString(locale);
  const toggle = (key: string) =>
    setExpanded(previous => ({ ...previous, [key]: !previous[key] }));
  const press = (
    label: string,
    action: () => void,
    selected = false,
    primary = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={action}
      style={[
        styles.button,
        selected && styles.selected,
        primary && styles.primary,
      ]}
    >
      <Text style={[styles.link, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
  const disclosure = (key: string, label: string, content: React.ReactNode) => (
    <View style={styles.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: !!expanded[key] }}
        onPress={() => toggle(key)}
        style={styles.disclosureButton}
      >
        <Text style={styles.heading}>{label}</Text>
        <Text accessible={false} style={styles.chevron}>
          {expanded[key] ? '−' : '+'}
        </Text>
      </Pressable>
      {expanded[key] ? (
        <View style={styles.disclosureContent}>{content}</View>
      ) : null}
    </View>
  );
  const recordLabel = (record: GrowthRecord) => {
    const kind = category(record);
    return kind ? t(`growth.album.${kind}`) : t(`growth.kind.${record.kind}`);
  };
  const evidence = (record: GrowthRecord) => (
    <>
      <Text style={styles.body}>{t(`growth.kind.${record.kind}`)}</Text>
      <Text style={styles.body}>{t(`growth.reason.${record.reason}`)}</Text>
      <Text style={styles.meta}>
        {t('growth.activityDate', { date: dateTime(record.occurredAt) })}
      </Text>
      <Text style={styles.meta}>
        {t('growth.sourceDate', {
          date: dateTime(
            vm.sessions.find(s => s.sessionId === record.reference.sessionId)
              ?.endedAt ?? null,
          ),
        })}
      </Text>
      {record.alternatives.length > 1 ? (
        <Text style={styles.meta}>
          {record.alternatives.map(name).join(' · ')}
        </Text>
      ) : null}
    </>
  );
  const historyRecord = (record: GrowthRecord) => (
    <View key={record.id} style={styles.historyRecord}>
      <Text style={styles.heading}>{recordLabel(record)}</Text>
      <Text style={styles.meta}>
        {t('growth.album.sourceLine', {
          date: date(record.occurredAt),
          level:
            vm.sessions.find(s => s.sessionId === record.reference.sessionId)
              ?.difficulty ?? '–',
        })}
      </Text>
      {press(
        t(
          record.reference.processId
            ? 'growth.album.replayProcess'
            : 'growth.album.replay',
        ),
        () => onReplay(record.reference),
      )}
      {disclosure(
        `${pageKey}:source:${record.id}`,
        t('growth.album.source'),
        evidence(record),
      )}
    </View>
  );
  const filter = filters[pageKey] ?? 'filterAll';
  const related =
    profile?.records.filter(
      r =>
        filter === 'filterAll' ||
        (filter === 'learning' && isLearning(r)) ||
        (filter === 'applications' && r.kind === 'application') ||
        (filter === 'possible' && !isLearning(r) && r.kind !== 'application'),
    ) ?? [];
  const limitKey = `${pageKey}:${filter}`;
  const limit = limits[limitKey] ?? 5;
  let profiles = vm.profiles.filter(
    p =>
      tab === 'all' ||
      (tab === 'followed'
        ? vm.followed.includes(p.technique)
        : p.records.length),
  );
  if (tab === 'recent')
    profiles = [...profiles].sort(
      (a, b) => (b.latestAt ?? -1) - (a.latestAt ?? -1),
    );
  const isFollowed = code !== undefined && vm.followed.includes(code);
  const sourceGame =
    latest && vm.sessions.find(s => s.sessionId === latest.reference.sessionId);
  const activeSource =
    sourceGame && ['active', 'paused'].includes(sourceGame.status);
  return (
    <View style={[styles.screen, hidden && styles.hidden]}>
      <View style={styles.topBar}>
        {press(`‹ ${t('app.back')}`, back)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('growth.about')}
          accessibilityState={{ expanded: !!expanded.about }}
          onPress={() => toggle('about')}
          style={styles.infoButton}
        >
          <Text accessible={false} allowFontScaling={false} style={styles.info}>
            ⓘ
          </Text>
        </Pressable>
      </View>
      <ScrollView
        key={pageKey}
        testID="technique-collection-scroll"
        contentOffset={initialOffset}
        onScroll={event => {
          offsets.current[pageKey] = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={100}
        contentContainerStyle={styles.content}
      >
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            {code ? name(code) : t('growth.title')}
          </Text>
          {code ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                isFollowed ? 'growth.unfollow' : 'growth.follow',
              )}
              accessibilityState={{ selected: isFollowed }}
              onPress={() => {
                setFollowError(false);
                controller.follow(code).catch(() => setFollowError(true));
              }}
              style={[
                styles.button,
                styles.follow,
                isFollowed && styles.selected,
              ]}
            >
              <Text style={styles.link}>
                {t(isFollowed ? 'growth.album.following' : 'growth.follow')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {expanded.about ? (
          <View style={styles.inset}>
            <Text style={styles.body}>{t('growth.aboutBody')}</Text>
            <Text style={styles.meta}>
              {t('growth.recentSummary', {
                count: vm.recentCount,
                learning: vm.recentLearning,
                applications: vm.recentApplications,
              })}
            </Text>
            <Text style={styles.meta}>
              {vm.sessions.filter(s => s.coverage === 'complete').length}/
              {vm.sessions.length} · {dateTime(vm.updatedAt)}
            </Text>
            <Text style={styles.meta}>{t('growth.note')}</Text>
          </View>
        ) : null}
        {vm.loading ? (
          <ActivityIndicator
            accessibilityLabel={t('growth.updating')}
            color={palette.accent}
          />
        ) : null}
        {vm.updating && !vm.loading ? (
          <Text style={styles.meta}>{t('growth.updating')}</Text>
        ) : null}
        {vm.failed || followError ? (
          <View style={styles.inset}>
            <Text style={styles.body}>{t('growth.failed')}</Text>
            {press(t('growth.retry'), () => {
              controller.retry().catch(() => undefined);
            })}
          </View>
        ) : null}
        {!code ? (
          <>
            <Text style={styles.subtitle}>{t('growth.album.subtitle')}</Text>
            <View style={styles.tabs}>
              {(['recent', 'followed', 'all'] as const).map(value => (
                <React.Fragment key={value}>
                  {press(
                    t(
                      value === 'followed'
                        ? 'growth.followed'
                        : `growth.album.${value}`,
                    ),
                    () => setTab(value),
                    tab === value,
                  )}
                </React.Fragment>
              ))}
            </View>
            {!profiles.length ? (
              <View style={styles.empty}>
                <TechniqueGraphic code="fullHouse" size={72} />
                <Text style={styles.heading}>
                  {t(
                    tab === 'followed' ? 'growth.followEmpty' : 'growth.empty',
                  )}
                </Text>
                {tab !== 'followed'
                  ? press(t('home.newGame'), onStart, false, true)
                  : null}
                {press(t('growth.all'), () => setTab('all'))}
              </View>
            ) : (
              <View style={styles.collection}>
                {profiles.map(p => (
                  <Pressable
                    key={p.technique}
                    testID={`technique-tile-${p.technique}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${name(p.technique)}. ${t(
                      profileCategory(p),
                    )}`}
                    onPress={() => setCode(p.technique)}
                    style={[
                      styles.tile,
                      {
                        width: (availableWidth - (columns - 1) * 12) / columns,
                      },
                      columns === 1 && styles.singleTile,
                    ]}
                  >
                    <TechniqueGraphic
                      code={p.technique}
                      size={columns === 1 ? 44 : 48}
                    />
                    <View style={styles.tileCopy}>
                      <Text style={styles.tileName}>{name(p.technique)}</Text>
                      <Text style={styles.tileStatus}>
                        {t(profileCategory(p))}
                      </Text>
                    </View>
                    {columns === 1 ? (
                      <Text accessible={false} style={styles.chevron}>
                        ›
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : profile ? (
          <>
            <View style={styles.hero}>
              {latest ? (
                <>
                  <View style={styles.encounterHeader}>
                    <Text style={styles.eyebrow}>
                      {t('growth.album.encounter')}
                    </Text>
                    <Text style={styles.tag}>{recordLabel(latest)}</Text>
                  </View>
                  <View
                    style={[
                      styles.previewRow,
                      wideDetail && styles.widePreview,
                    ]}
                  >
                    <View style={styles.boardColumn}>
                      {loadingPreview ? (
                        <View
                          style={[
                            styles.previewPlaceholder,
                            { width: boardSize, height: boardSize },
                          ]}
                        >
                          <ActivityIndicator color={palette.accent} />
                        </View>
                      ) : preview ? (
                        <RecordBoard
                          preview={preview}
                          size={boardSize}
                          label={t('growth.album.board', {
                            step: preview.step,
                          })}
                        />
                      ) : (
                        <View
                          style={[
                            styles.previewPlaceholder,
                            { width: boardSize },
                          ]}
                        >
                          <TechniqueGraphic code={code} size={64} />
                          <Text style={styles.meta}>
                            {t(
                              activeSource
                                ? 'growth.activeNotice'
                                : 'growth.album.unavailable',
                            )}
                          </Text>
                        </View>
                      )}
                      {preview ? (
                        <Text style={styles.meta}>
                          {t('growth.album.before', { step: preview.step })}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.heroActions}>
                      <Text style={styles.meta}>
                        {t('growth.album.sourceLine', {
                          date: date(latest.occurredAt),
                          level: sourceGame?.difficulty ?? '–',
                        })}
                      </Text>
                      {!activeSource
                        ? press(
                            t(
                              latest.reference.processId
                                ? 'growth.album.replayProcess'
                                : 'growth.album.replay',
                            ),
                            () => onReplay(latest.reference),
                            false,
                            true,
                          )
                        : null}
                      {disclosure(
                        `${pageKey}:heroSource`,
                        t('growth.album.source'),
                        evidence(latest),
                      )}
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.empty}>
                  <TechniqueGraphic code={code} size={80} />
                  <Text style={styles.heading}>{t('growth.state.empty')}</Text>
                  <Text style={styles.emptyTitle}>
                    {t('growth.album.noSample')}
                  </Text>
                  <Text style={styles.meta}>
                    {t('growth.album.noSampleBody')}
                  </Text>
                </View>
              )}
            </View>
            {profile.records.length
              ? disclosure(
                  `${pageKey}:history`,
                  t('growth.album.history'),
                  <>
                    <View style={styles.tabs}>
                      {(
                        [
                          'filterAll',
                          'learning',
                          'applications',
                          'possible',
                        ] as const
                      ).map(value => (
                        <React.Fragment key={value}>
                          {press(
                            t(`growth.${value}`),
                            () =>
                              setFilters(previous => ({
                                ...previous,
                                [pageKey]: value,
                              })),
                            filter === value,
                          )}
                        </React.Fragment>
                      ))}
                    </View>
                    {related.length ? (
                      related.slice(0, limit).map(historyRecord)
                    ) : (
                      <Text style={styles.meta}>{t('growth.state.empty')}</Text>
                    )}
                    {related.length > limit
                      ? press(
                          t('growth.moreRecords', {
                            count: related.length - limit,
                          }),
                          () =>
                            setLimits(previous => ({
                              ...previous,
                              [limitKey]: limit + 10,
                            })),
                        )
                      : null}
                  </>,
                )
              : null}
            {disclosure(
              `${pageKey}:numbers`,
              t('growth.album.numbers'),
              <>
                <Text style={styles.body}>
                  {t('growth.learningCount', {
                    count: profile.learningSessions,
                  })}
                </Text>
                <Text style={styles.body}>
                  {t('growth.applicationCount', {
                    count: profile.applications,
                  })}
                </Text>
                <Text style={styles.body}>
                  {t('growth.puzzleCount', { count: profile.puzzles })}
                </Text>
                <Text style={styles.heading}>{t('growth.trend')}</Text>
                {growthWindows(vm, profile.technique).every(
                  w => w.sessions === 10,
                ) ? (
                  growthWindows(vm, profile.technique).map((window, i) => (
                    <View key={i} style={styles.inset}>
                      <Text style={styles.body}>
                        {t('growth.window', {
                          label: t(i ? 'growth.previous10' : 'growth.last10'),
                          count: window.applications,
                          puzzles: window.puzzles,
                          covered: window.covered,
                          total: window.sessions,
                        })}
                      </Text>
                      <Text style={styles.meta}>
                        {date(window.from)} – {date(window.to)}
                      </Text>
                      <Text style={styles.meta}>
                        {t('growth.levels', {
                          levels: [1, 2, 3, 4, 5]
                            .map(
                              level =>
                                `L${level} × ${
                                  window.levels.filter(v => v === level).length
                                }`,
                            )
                            .join(' · '),
                        })}
                      </Text>
                      {window.covered < 10 ? (
                        <Text style={styles.meta}>
                          {t('growth.missingWindow')}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.meta}>{t('growth.insufficient')}</Text>
                )}
                {profile.milestones.length ? (
                  <Text style={styles.heading}>{t('growth.milestones')}</Text>
                ) : null}
                {profile.milestones.map(m => (
                  <View key={m.kind} style={styles.inset}>
                    <Text style={styles.body}>
                      {t(`growth.milestone.${m.kind}`)}
                    </Text>
                    {historyRecord(m.record)}
                  </View>
                ))}
              </>,
            )}
            {disclosure(
              `${pageKey}:technique`,
              t('growth.album.technique'),
              <Text style={styles.body}>
                {HINT_PRESENTATION_COPIES[locale].techniques[
                  code
                ].observe.replace(/\{(\w+)\}/g, (_, key: string) =>
                  key === 'regions'
                    ? t('techniques.genericRegions')
                    : key === 'targetDigit'
                    ? t('techniques.genericDigit')
                    : t('techniques.genericCandidates'),
                )}
              </Text>,
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (p: AppPalette) =>
  StyleSheet.create({
    screen: { flex: 1 },
    hidden: { display: 'none' },
    topBar: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 52,
    },
    content: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 18,
    },
    titleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '800',
      color: p.ink,
      flexShrink: 1,
    },
    subtitle: { fontSize: 18, lineHeight: 27, color: p.muted },
    heading: {
      fontSize: 18,
      lineHeight: 27,
      fontWeight: '700',
      color: p.ink,
      flexShrink: 1,
    },
    body: { fontSize: 17, lineHeight: 26, color: p.ink },
    meta: { fontSize: 16, lineHeight: 24, color: p.muted },
    button: {
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    link: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: p.accent },
    selected: { backgroundColor: p.accentSoft },
    primary: { backgroundColor: p.accent, minHeight: 54, width: '100%' },
    primaryText: { color: p.background, textAlign: 'center' },
    follow: { borderWidth: 1, borderColor: p.line },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    infoButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { fontSize: 27, color: p.accent },
    collection: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: {
      minHeight: 174,
      borderRadius: 18,
      padding: 18,
      backgroundColor: p.surface,
      gap: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
    },
    singleTile: {
      minHeight: 104,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
    },
    tileCopy: { flex: 1, gap: 5 },
    tileName: { fontSize: 20, lineHeight: 27, fontWeight: '700', color: p.ink },
    tileStatus: { fontSize: 16, lineHeight: 23, color: p.muted },
    chevron: { color: p.accent, fontSize: 24, lineHeight: 30 },
    hero: {
      borderRadius: 22,
      padding: 18,
      backgroundColor: p.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
      gap: 18,
    },
    encounterHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    eyebrow: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      color: p.muted,
    },
    tag: {
      fontSize: 16,
      lineHeight: 24,
      color: p.accent,
      backgroundColor: p.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    previewRow: { gap: 20 },
    widePreview: { flexDirection: 'row', alignItems: 'center' },
    boardColumn: { alignItems: 'center', gap: 10 },
    heroActions: { flex: 1, gap: 14 },
    previewPlaceholder: {
      minHeight: 170,
      gap: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: { alignItems: 'center', paddingVertical: 24, gap: 20 },
    emptyTitle: {
      fontSize: 22,
      lineHeight: 30,
      fontWeight: '700',
      textAlign: 'center',
      color: p.ink,
    },
    disclosure: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
    },
    disclosureButton: {
      minHeight: 64,
      paddingVertical: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    disclosureContent: { gap: 12, paddingBottom: 18 },
    inset: { gap: 10, paddingVertical: 12 },
    historyRecord: {
      gap: 8,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: p.line,
    },
  });
