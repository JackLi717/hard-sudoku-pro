import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SessionReviewEntry } from '../application/technique-recognition/session-review';
import { BehaviorShadowRecord } from '../application/technique-recognition/shadow-controller';
import {
  OpportunityProcess,
  OpportunityProcessReport,
} from '../application/technique-recognition/opportunity-processes';
import { verifyReviewProcesses } from '../application/technique-recognition/review-processes';
import { TechniqueOpportunityAnalyzer } from '../domain/technique-recognition/contracts';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../localization';
import { useAppTheme } from '../ui/theme';
import { sessionReviewCopy } from './session-review-copy';

export function ProcessReview({
  entry,
  records,
  analyzer,
  refreshing,
  onInspect,
}: {
  entry: SessionReviewEntry;
  records: readonly BehaviorShadowRecord[];
  analyzer?: TechniqueOpportunityAnalyzer;
  refreshing: boolean;
  onInspect(process: OpportunityProcess): void;
}) {
  const { locale } = useLocalization();
  const copy = sessionReviewCopy(locale);
  const { palette } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          padding: 16,
          gap: 10,
          borderWidth: 1,
          borderColor: palette.line,
          borderRadius: 16,
          backgroundColor: palette.surface,
        },
        title: {
          fontSize: 20,
          lineHeight: 28,
          fontWeight: '700',
          color: palette.ink,
        },
        body: { fontSize: 17, lineHeight: 26, color: palette.ink },
        button: {
          minHeight: 48,
          padding: 12,
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: palette.accent,
          borderRadius: 12,
        },
        buttonText: { fontSize: 17, color: palette.accent, fontWeight: '700' },
        path: {
          gap: 8,
          paddingTop: 12,
          borderTopWidth: 1,
          borderColor: palette.line,
        },
      }),
    [palette],
  );
  const active = useRef<AbortController | null>(null);
  const [state, setState] = useState<{
    records: readonly BehaviorShadowRecord[];
    status: 'idle' | 'running' | 'done' | 'failed';
    report?: OpportunityProcessReport;
  }>({ records, status: 'idle' });
  useEffect(() => {
    active.current?.abort();
    setState({ records, status: 'idle' });
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [records, entry.id, analyzer, refreshing]);
  const current = state.records === records && !refreshing ? state : null;
  const eligible = entry.status === 'explained' || entry.reason === 'no_match';
  const run = async () => {
    if (!analyzer || !entry.request || refreshing || !eligible) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState({ records, status: 'running' });
    try {
      const report = await verifyReviewProcesses(
        records,
        entry.request.sessionId,
        entry.request.requestId,
        analyzer,
        controller.signal,
      );
      if (!controller.signal.aborted && active.current === controller)
        setState({ records, status: 'done', report });
    } catch {
      if (!controller.signal.aborted && active.current === controller)
        setState({ records, status: 'failed' });
    }
  };
  const report = current?.report;
  const explanations = report?.placementExplanations ?? [];
  const names = (p: OpportunityProcess) =>
    p.attribution?.candidateTechniques
      .map(c => HINT_PRESENTATION_COPIES[locale].techniques[c.technique].name)
      .join(' / ');
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {copy.processTitle}
      </Text>
      <Text style={styles.body}>{copy.processNote}</Text>
      {!eligible ? (
        <Text style={styles.body}>{copy.processBlocked}</Text>
      ) : !analyzer ? (
        <Text style={styles.body}>{copy.processUnavailable}</Text>
      ) : current?.status === 'running' ? (
        <>
          <ActivityIndicator color={palette.accent} />
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {copy.processRunning}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => {
              active.current?.abort();
              setState({ records, status: 'idle' });
            }}
          >
            <Text style={styles.buttonText}>{copy.processCancel}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: refreshing }}
          disabled={refreshing}
          style={styles.button}
          onPress={() => {
            run().catch(() => undefined);
          }}
        >
          <Text style={styles.buttonText}>{copy.processVerify}</Text>
        </Pressable>
      )}
      {current?.status === 'failed' ? (
        <Text style={styles.body}>{copy.processFailed}</Text>
      ) : null}
      {report ? (
        <>
          {!report.enumerationComplete ? (
            <Text style={styles.body}>{copy.processIncomplete}</Text>
          ) : null}
          {report.enumerationComplete && !report.processes.length ? (
            <Text style={styles.body}>{copy.processMissing}</Text>
          ) : null}
          {explanations.map(e => (
            <View key={`${e.sampleId}:${e.effect.cell}`} style={styles.path}>
              <Text style={styles.title}>
                R{Math.floor(e.effect.cell / 9) + 1}C{(e.effect.cell % 9) + 1} ={' '}
                {e.effect.digit}
              </Text>
              <Text style={styles.body}>
                {e.dependencyStatus === 'observed'
                  ? copy.processObserved
                  : e.dependencyStatus === 'possible'
                  ? copy.processPossible
                  : e.dependencyStatus === 'unverified'
                  ? copy.processFailed
                  : copy.processNotEstablished}
              </Text>
              {e.paths.length > 1 ? (
                <Text style={styles.body}>{copy.processAmbiguous}</Text>
              ) : null}
            </View>
          ))}
          {report.enumerationComplete
            ? report.processes.map((p, index) => (
                <View key={p.id} style={styles.path}>
                  <Text style={styles.title}>
                    {copy.processPath} {index + 1}
                  </Text>
                  {p.anchor.requestId === entry.request?.requestId ? (
                    <Text style={styles.body}>{copy.processLocalScope}</Text>
                  ) : null}
                  {p.attribution?.automaticTechnique &&
                  p.attribution.attributionEligibility.status === 'eligible' ? (
                    <>
                      <Text style={styles.body}>
                        {copy.processDefault}:{' '}
                        {
                          HINT_PRESENTATION_COPIES[locale].techniques[
                            p.attribution.automaticTechnique
                          ].name
                        }
                      </Text>
                      <Text style={styles.body}>
                        {copy.candidates}: {names(p)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.body}>{copy.processFailed}</Text>
                  )}
                  {p.followUps.some(
                    f => f.prerequisite.basis === 'already_available',
                  ) ? (
                    <Text style={styles.body}>{copy.processAlready}</Text>
                  ) : null}
                  {p.followUps.some(
                    f => f.prerequisite.basis === 'unobserved_effects',
                  ) ? (
                    <Text style={styles.body}>{copy.processPossible}</Text>
                  ) : null}
                  <Text style={styles.body}>
                    {copy.revision}: {p.anchor.startingRevision}
                  </Text>
                  <Text style={styles.body}>
                    {copy.processActual}:{' '}
                    {p.observedEffects.length
                      ? p.observedEffects
                          .map(
                            e =>
                              `R${Math.floor(e.cell / 9) + 1}C${
                                (e.cell % 9) + 1
                              } ${e.kind === 'placement' ? '=' : '−'} ${
                                e.digit
                              }`,
                          )
                          .join(' / ')
                      : copy.processNoActions}
                  </Text>
                  {p.remainingEffects.length ? (
                    <Text style={styles.body}>{copy.processPartial}</Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    style={styles.button}
                    onPress={() => onInspect(p)}
                  >
                    <Text style={styles.buttonText}>{copy.processBoard}</Text>
                  </Pressable>
                </View>
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}
