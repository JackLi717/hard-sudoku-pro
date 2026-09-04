import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TechniqueGrowthController } from '../../application/technique-growth/controller';
import {
  GrowthRecord,
  GrowthReference,
  GrowthViewModel,
} from '../../application/technique-growth/contracts';
import {
  buildGrowthViewModel,
  isLearning,
} from '../../application/technique-growth/view-model';
import { SessionReplaySource } from '../../application/game/session-replay-source';
import { TechniqueCollection } from './TechniqueCollection';
import { TechniqueCode } from '../../domain/hints/techniques';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { useAppTheme, AppPalette } from '../theme';
export function useGrowth(controller?: TechniqueGrowthController) {
  const [vm, setVm] = useState<GrowthViewModel>(
    () => controller?.snapshot ?? buildGrowthViewModel([]),
  );
  useEffect(() => controller?.subscribe(setVm), [controller]);
  return vm;
}
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
  const styles = useMemo(() => createStyles(palette), [palette]);
  const session = vm.sessions.find(s => s.sessionId === sessionId);
  const summaries = session?.records
    .filter(
      r => r.technique && r.kind !== 'related_finish' && r.kind !== 'unknown',
    )
    .sort(
      (a, b) =>
        (isLearning(a) ? 0 : a.kind === 'application' ? 1 : 2) -
        (isLearning(b) ? 0 : b.kind === 'application' ? 1 : 2),
    );
  const unique = summaries
    ?.filter(
      (r, i, all) =>
        all.findIndex(a => a.technique === r.technique && a.kind === r.kind) ===
        i,
    )
    .slice(0, 3);
  const latest = vm.profiles
    .filter(p => p.records.length)
    .sort((a, b) => (b.latestAt ?? 0) - (a.latestAt ?? 0))[0];
  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={styles.card}>
      <Text style={styles.heading}>
        {t(sessionId ? 'growth.footprint' : 'growth.title')} ›
      </Text>
      {sessionId ? (
        unique?.length ? (
          unique.map(r => (
            <Text key={r.id} style={styles.body}>
              {HINT_PRESENTATION_COPIES[locale].techniques[r.technique!].name} ·{' '}
              {t(`growth.kind.${r.kind}`)}
            </Text>
          ))
        ) : (
          <Text style={styles.body}>
            {t(session ? 'growth.emptyFootprint' : 'growth.coverage.pending')}
          </Text>
        )
      ) : (
        <Text style={styles.body}>
          {latest
            ? `${
                HINT_PRESENTATION_COPIES[locale].techniques[latest.technique]
                  .name
              } · ${t(`growth.state.${latest.status}`)}`
            : t('growth.intro')}
        </Text>
      )}
    </Pressable>
  );
}
type Route =
  | { kind: 'overview' }
  | { kind: 'detail'; code: TechniqueCode }
  | { kind: 'footprint'; sessionId: string };
export function GrowthScreens({
  controller,
  vm,
  initialSessionId,
  source,
  onClose,
  onReplay,
  onStart,
  hidden = false,
}: {
  controller: TechniqueGrowthController;
  vm: GrowthViewModel;
  initialSessionId?: string;
  source?: SessionReplaySource;
  onClose(): void;
  onReplay(ref: GrowthReference): void;
  onStart(): void;
  hidden?: boolean;
}) {
  const { t, locale } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [stack, setStack] = useState<Route[]>([
    initialSessionId
      ? { kind: 'footprint', sessionId: initialSessionId }
      : { kind: 'overview' },
  ]);
  const route = stack[stack.length - 1];
  const [recordLimits, setRecordLimits] = useState<Record<string, number>>({});
  const [about, setAbout] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const offsets = useRef<Record<string, number>>({});
  const routeKey = JSON.stringify(route);
  const back = () =>
    stack.length > 1 ? setStack(s => s.slice(0, -1)) : onClose();
  useEffect(() => {
    if (hidden || route.kind !== 'footprint') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  });
  const session =
    route.kind === 'footprint'
      ? vm.sessions.find(s => s.sessionId === route.sessionId)
      : null;
  const date = (n: number | null) =>
    n === null ? t('growth.unknownDate') : new Date(n).toLocaleString(locale);
  const button = (label: string, onPress: () => void, selected = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.button, selected && styles.selected]}
    >
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
  const openDetail = (code: TechniqueCode) => {
    setWhy(null);
    setStack(s => [...s, { kind: 'detail', code }]);
  };
  const record = (r: GrowthRecord) => (
    <View key={r.id} style={styles.record}>
      {r.technique && route.kind !== 'detail'
        ? button(
            HINT_PRESENTATION_COPIES[locale].techniques[r.technique].name,
            () => openDetail(r.technique!),
          )
        : null}
      <Text style={styles.body}>{t(`growth.kind.${r.kind}`)}</Text>
      <Text style={styles.meta}>
        {t('growth.activityDate', { date: date(r.occurredAt) })}
      </Text>
      {button(t('growth.view'), () => onReplay(r.reference))}
      {button(t('growth.why'), () => setWhy(why === r.id ? null : r.id))}
      {why === r.id ? (
        <Text style={styles.body}>
          {t(`growth.reason.${r.reason}`)}
          {r.alternatives.length > 1
            ? `\n${r.alternatives
                .map(
                  code =>
                    HINT_PRESENTATION_COPIES[locale].techniques[code].name,
                )
                .join(' · ')}`
            : ''}
        </Text>
      ) : null}
    </View>
  );
  const recordList = (key: string, rows: readonly GrowthRecord[]) => {
    const count = recordLimits[key] ?? 3;
    return (
      <>
        {rows.slice(0, count).map(record)}
        {rows.length > count
          ? button(
              t('growth.moreRecords', { count: rows.length - count }),
              () =>
                setRecordLimits(previous => ({
                  ...previous,
                  [key]: count + 10,
                })),
            )
          : null}
      </>
    );
  };
  if (route.kind !== 'footprint')
    return (
      <TechniqueCollection
        controller={controller}
        vm={vm}
        source={source}
        initialCode={route.kind === 'detail' ? route.code : undefined}
        onClose={back}
        onReplay={onReplay}
        onStart={onStart}
        hidden={hidden}
      />
    );
  const title = t('growth.footprint');
  return (
    <View style={[styles.screen, hidden && styles.hidden]}>
      <View style={styles.header}>
        {button(`‹ ${t('app.back')}`, back)}
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      <ScrollView
        key={routeKey}
        contentContainerStyle={styles.content}
        contentOffset={{ x: 0, y: offsets.current[routeKey] ?? 0 }}
        onScroll={e => {
          offsets.current[routeKey] = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={100}
      >
        {button(t('growth.about'), () => setAbout(!about))}
        {about ? (
          <View style={styles.card}>
            <Text style={styles.body}>{t('growth.aboutBody')}</Text>
            <Text style={styles.meta}>
              {vm.sessions.filter(s => s.coverage === 'complete').length}/
              {vm.sessions.length} · {date(vm.updatedAt)}
            </Text>
          </View>
        ) : null}
        {vm.loading ? <ActivityIndicator color={palette.accent} /> : null}
        {vm.updating ? (
          <Text style={styles.meta}>{t('growth.updating')}</Text>
        ) : null}
        {vm.failed ? (
          <View style={styles.card}>
            <Text style={styles.body}>{t('growth.failed')}</Text>
            {button(t('growth.retry'), () => {
              controller.retry().catch(() => undefined);
            })}
          </View>
        ) : null}
        {route.kind === 'footprint' ? (
          <>
            <Text style={styles.body}>
              {session
                ? `${date(session.endedAt)} · ${t('game.level', {
                    level: session.difficulty,
                  })}`
                : t('growth.coverage.pending')}
            </Text>
            {session ? (
              <Text style={styles.body}>
                {t(
                  session.status === 'completed'
                    ? 'replay.statusCompleted'
                    : session.status === 'failed'
                    ? 'replay.statusFailed'
                    : session.status === 'abandoned'
                    ? 'replay.statusAbandoned'
                    : 'growth.activeNotice',
                )}{' '}
                · {t(`growth.coverage.${session.coverage}`)}
              </Text>
            ) : null}
            {(['learning', 'applications', 'possible'] as const).map(
              section => (
                <View key={section} style={styles.card}>
                  <Text accessibilityRole="header" style={styles.heading}>
                    {t(`growth.${section}`)}
                  </Text>
                  {section === 'learning'
                    ? [
                        ...new Set(
                          session?.records
                            .filter(isLearning)
                            .map(r => r.technique),
                        ),
                      ].map(code => (
                        <View key={code ?? 'unknown'}>
                          {code ? (
                            <Text style={styles.heading}>
                              {
                                HINT_PRESENTATION_COPIES[locale].techniques[
                                  code
                                ].name
                              }
                            </Text>
                          ) : null}
                          {recordList(
                            `${routeKey}:learning:${code}`,
                            session!.records.filter(
                              r => isLearning(r) && r.technique === code,
                            ),
                          )}
                        </View>
                      ))
                    : recordList(
                        `${routeKey}:${section}`,
                        session?.records.filter(r =>
                          section === 'applications'
                            ? r.kind === 'application'
                            : !isLearning(r) && r.kind !== 'application',
                        ) ?? [],
                      )}
                </View>
              ),
            )}
            {button(t('replay.title'), () =>
              onReplay({ sessionId: route.sessionId, moveIds: [] }),
            )}
          </>
        ) : null}
        <Text style={styles.meta}>{t('growth.note')}</Text>
      </ScrollView>
    </View>
  );
}
const createStyles = (p: AppPalette) =>
  StyleSheet.create({
    screen: { flex: 1 },
    hidden: { display: 'none' },
    content: {
      padding: 20,
      paddingBottom: 40,
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      gap: 12,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    title: { fontSize: 26, fontWeight: '800', color: p.ink, marginVertical: 8 },
    heading: { fontSize: 18, fontWeight: '700', color: p.ink, lineHeight: 26 },
    body: { fontSize: 17, lineHeight: 26, color: p.ink },
    meta: { fontSize: 16, lineHeight: 24, color: p.muted },
    card: {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      padding: 18,
      gap: 8,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: p.line,
      backgroundColor: p.surface,
    },
    button: {
      minHeight: 44,
      paddingVertical: 10,
      paddingHorizontal: 10,
      justifyContent: 'center',
      borderRadius: 12,
    },
    link: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: p.accent },
    selected: { backgroundColor: p.accentSoft },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    record: { borderTopWidth: 1, borderColor: p.line, paddingTop: 12, gap: 4 },
  });
