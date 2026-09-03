import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SessionReviewEntry,
  SessionReviewSource,
  buildSessionReview,
} from '../application/technique-recognition/session-review';
import { boardFromFingerprint } from '../domain/sudoku/board';
import { HintPageVisuals } from '../domain/hints/presentation';
import { TechniqueCode } from '../domain/hints/techniques';
import {
  HintAssistanceSource,
  NormalizedPlayerEffect,
} from '../domain/technique-recognition/contracts';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../localization';
import { SudokuBoard, SudokuBoardState } from '../ui/components/SudokuBoard';
import { AppPalette, useAppTheme } from '../ui/theme';
import {
  reviewReason,
  reviewStatus,
  sessionReviewCopy,
} from './session-review-copy';

const ignoreCellSelection = () => undefined;

function Detail({ entry }: { entry: SessionReviewEntry }): React.JSX.Element {
  const { locale } = useLocalization();
  const copy = sessionReviewCopy(locale);
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [showEffects, setShowEffects] = useState(false);
  const request = entry.request;
  const name = (code: TechniqueCode) =>
    HINT_PRESENTATION_COPIES[locale].techniques[code].name;
  const effectText = (effect: NormalizedPlayerEffect) =>
    `${effect.kind === 'placement' ? copy.place : copy.remove} R${
      Math.floor(effect.cell / 9) + 1
    }C${(effect.cell % 9) + 1} ${effect.kind === 'placement' ? '=' : '−'} ${
      effect.digit
    }`;
  const boardState = useMemo<SudokuBoardState | null>(() => {
    if (!request) {
      return null;
    }
    const values = boardFromFingerprint(request.startingBoardFingerprint);
    return {
      values,
      givens: values.map((value, cell) =>
        request.givenCells[cell] ? value : null,
      ),
      selectedCell: null,
      incorrectCells: [],
      status: 'completed',
      activeHint: null,
      candidates: {
        manualCandidates: request.growthCandidates,
        quickCandidates: request.growthCandidates,
        hintCandidates: null,
        activeCandidateSource: 'manual',
        pencilMode: false,
        quickDraftGenerated: false,
        quickDraftBoardFingerprint: null,
        hintBoardFingerprint: null,
      },
    };
  }, [request]);
  const visuals = useMemo<HintPageVisuals | undefined>(
    () =>
      request && showEffects
        ? {
            showFocusCells: false,
            showFocusRegions: false,
            showPremises: false,
            showEliminations: true,
            showPlacements: true,
            eliminations: request.observedEffects.filter(
              effect => effect.kind === 'elimination',
            ),
            placements: request.observedEffects.filter(
              effect => effect.kind === 'placement',
            ),
          }
        : undefined,
    [request, showEffects],
  );
  const hint = request?.hintAssistance;
  const sources = new Map<
    string,
    { source: HintAssistanceSource; applied: boolean }
  >([
    ...(hint?.knownSources ?? []).map(
      source => [source.sourceId, { source, applied: false }] as const,
    ),
    ...(hint?.appliedSources ?? []).map(
      source => [source.sourceId, { source, applied: true }] as const,
    ),
  ]);

  return (
    <>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>
          {reviewStatus(entry, locale === 'zh-Hans')}
          {entry.status === 'explained' && entry.attribution?.automaticTechnique
            ? ` · ${name(entry.attribution.automaticTechnique)}`
            : ''}
        </Text>
        <Text style={styles.body}>
          {entry.status === 'explained'
            ? copy.defaultNote
            : reviewReason(entry.reason, locale === 'zh-Hans')}
        </Text>
        {entry.hintSourceMissing ? (
          <Text style={styles.body}>{copy.missingHint}</Text>
        ) : null}
      </View>
      {request && boardState ? (
        <>
          <View style={styles.actions}>
            {[false, true].map(effects => (
              <Pressable
                key={String(effects)}
                accessibilityRole="button"
                accessibilityState={{ selected: showEffects === effects }}
                onPress={() => setShowEffects(effects)}
                style={[
                  styles.button,
                  showEffects === effects && styles.selected,
                ]}
              >
                <Text style={styles.buttonText}>
                  {effects ? copy.effects : copy.start}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.board}>
            <SudokuBoard
              state={boardState}
              disabled
              hintAnimations={false}
              hintSpotlight={false}
              hintVisuals={visuals}
              highlightRegions={false}
              highlightSameDigit={false}
              onSelectCell={ignoreCellSelection}
            />
          </View>
          <Text style={styles.body}>{copy.boardNote}</Text>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>
              {copy.actual}
            </Text>
            {request.observedEffects.map((effect, index) => (
              <Text key={index} style={styles.body}>
                {index + 1}. {effectText(effect)}
              </Text>
            ))}
            <Text style={styles.meta}>
              {copy.revision}: {request.startingRevision} · {request.segmentId}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.body}>{copy.missing}</Text>
      )}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>
          {copy.candidates}
        </Text>
        <Text style={styles.body}>{copy.candidatesNote}</Text>
        {entry.attribution?.candidateTechniques.length ? (
          entry.attribution.candidateTechniques.map(candidate => (
            <Text key={candidate.technique} style={styles.body}>
              {name(candidate.technique)}
            </Text>
          ))
        ) : (
          <Text style={styles.body}>{copy.none}</Text>
        )}
      </View>
      {hint ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>
            {copy.hints}
          </Text>
          {[...sources.values()].map(({ source, applied }) => (
            <View key={source.sourceId} style={styles.source}>
              <Text style={styles.body}>
                {name(source.technique)} · {applied ? copy.applied : copy.shown}
              </Text>
              <Text style={styles.body}>
                {copy.hintEffects}:{' '}
                {[
                  ...source.placements.map(effect =>
                    effectText({ ...effect, kind: 'placement' }),
                  ),
                  ...source.eliminations.map(effect =>
                    effectText({ ...effect, kind: 'elimination' }),
                  ),
                ].join(' / ')}
              </Text>
            </View>
          ))}
          <Text style={styles.body}>
            {copy.assisted}:{' '}
            {hint.affectedEffects.length
              ? hint.affectedEffects.map(effectText).join(' / ')
              : copy.noAffected}
          </Text>
        </View>
      ) : null}
    </>
  );
}

export function SessionTechniqueReview({
  sessionId,
  source,
  onClose,
}: {
  sessionId: string;
  source?: SessionReviewSource;
  onClose(): void;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const copy = sessionReviewCopy(locale);
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [entries, setEntries] = useState<readonly SessionReviewEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const selected = entries.find(entry => entry.id === selectedId);

  useEffect(() => {
    let active = true;
    let generation = 0;
    const read = async () => {
      const current = ++generation;
      setLoading(true);
      try {
        if (!source) {
          throw new Error('Diagnostic source unavailable');
        }
        const records = await source.readSession(sessionId);
        if (active && generation === current) {
          setEntries(buildSessionReview(records, sessionId));
          setFailed(false);
        }
      } catch {
        if (active && generation === current) {
          setEntries([]);
          setFailed(true);
        }
      } finally {
        if (active && generation === current) {
          setLoading(false);
        }
      }
    };
    const unsubscribe = source?.subscribe(changedSession => {
      if (changedSession === null || changedSession === sessionId) {
        read().catch(() => undefined);
      }
    });
    read().catch(() => undefined);
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [refresh, sessionId, source]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (selectedId) {
          setSelectedId(null);
        } else {
          onClose();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose, selectedId]);

  const names = [
    ...new Set(
      entries.flatMap(entry =>
        entry.status === 'explained' && entry.attribution?.automaticTechnique
          ? [
              HINT_PRESENTATION_COPIES[locale].techniques[
                entry.attribution.automaticTechnique
              ].name,
            ]
          : [],
      ),
    ),
  ];
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => (selectedId ? setSelectedId(null) : onClose())}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {selectedId ? copy.list : copy.back}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setRefresh(value => value + 1)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{copy.refresh}</Text>
        </Pressable>
      </View>
      <ScrollView
        key={selectedId ?? 'list'}
        contentContainerStyle={styles.content}
      >
        <Text accessibilityRole="header" style={styles.title}>
          {copy.title}
        </Text>
        {!selected ? (
          <>
            <Text style={styles.body}>{copy.intro}</Text>
            <Text style={styles.body}>{copy.boundary}</Text>
          </>
        ) : null}
        {loading ? (
          <View accessibilityLiveRegion="polite">
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.body}>{copy.loading}</Text>
          </View>
        ) : null}
        {failed ? (
          <Text style={styles.body}>{copy.failed}</Text>
        ) : selected ? (
          <Detail key={selected.id} entry={selected} />
        ) : (
          <>
            {!loading && entries.length === 0 ? (
              <Text style={styles.body}>{copy.empty}</Text>
            ) : null}
            {entries.length > 0 ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.heading}>
                  {copy.summary}
                </Text>
                <Text style={styles.body}>
                  {names.length ? names.join(' · ') : copy.noExplanation}
                </Text>
                <Text style={styles.meta}>
                  {entries.length} {copy.count}
                </Text>
              </View>
            ) : null}
            {entries.map((entry, index) => (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                onPress={() => setSelectedId(entry.id)}
                style={styles.card}
              >
                <Text style={styles.meta}>
                  {copy.segment} {index + 1}
                </Text>
                <Text style={styles.heading}>
                  {reviewStatus(entry, locale === 'zh-Hans')}
                  {entry.status === 'explained' &&
                  entry.attribution?.automaticTechnique
                    ? ` · ${
                        HINT_PRESENTATION_COPIES[locale].techniques[
                          entry.attribution.automaticTechnique
                        ].name
                      }`
                    : ''}
                </Text>
                {entry.opportunity?.status === 'resolved' ? (
                  <Text style={styles.meta}>
                    {copy.opportunity} #
                    {[
                      ...new Set(
                        entries.flatMap(
                          e => e.opportunity?.opportunityIds ?? [],
                        ),
                      ),
                    ].indexOf(entry.opportunity.opportunityIds[0]) + 1}
                  </Text>
                ) : entry.opportunity?.status === 'ambiguous' ? (
                  <Text style={styles.meta}>{copy.ambiguousOpportunity}</Text>
                ) : entry.opportunity?.status === 'missing_evidence' ? (
                  <Text style={styles.meta}>{copy.missingOpportunity}</Text>
                ) : null}
                {entry.reason ? (
                  <Text style={styles.body}>
                    {reviewReason(entry.reason, locale === 'zh-Hans')}
                  </Text>
                ) : null}
                {entry.request?.observedEffects.map((effect, effectIndex) => (
                  <Text key={effectIndex} style={styles.body}>
                    {effect.kind === 'placement' ? copy.place : copy.remove} R
                    {Math.floor(effect.cell / 9) + 1}C{(effect.cell % 9) + 1}{' '}
                    {effect.kind === 'placement' ? '=' : '−'} {effect.digit}
                  </Text>
                ))}
                <Text style={styles.link}>{copy.open}</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    screen: { flex: 1 },
    header: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
      padding: 12,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
    },
    content: {
      padding: 12,
      paddingBottom: 32,
      gap: 12,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
    },
    title: { fontSize: 26, fontWeight: '800', color: palette.ink },
    heading: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '700',
      color: palette.ink,
    },
    body: { fontSize: 17, lineHeight: 26, color: palette.ink },
    meta: { fontSize: 14, lineHeight: 21, color: palette.muted },
    card: {
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 16,
      backgroundColor: palette.surface,
    },
    button: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 12,
    },
    buttonText: { color: palette.accent, fontWeight: '700', fontSize: 17 },
    selected: {
      backgroundColor: palette.selected,
      borderColor: palette.accent,
    },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    board: { alignItems: 'center' },
    source: { gap: 4, marginBottom: 8 },
    link: {
      color: palette.accent,
      fontSize: 17,
      fontWeight: '700',
      marginTop: 4,
    },
  });
}
