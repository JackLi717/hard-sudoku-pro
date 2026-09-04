import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { TechniqueGrowthController } from '../../application/technique-growth/controller';
import { GROWTH_POLICY } from '../../application/technique-growth/contracts';
import { GameSession } from '../../domain/game/contracts';
import { TechniqueCode } from '../../domain/hints/techniques';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { useAppTheme } from '../theme';
/** Mounted in reserved free space below controls, never above the board. */
export function GrowthLightFeedback({
  controller,
  session,
  enabled,
  safe,
}: {
  controller: TechniqueGrowthController;
  session: GameSession;
  enabled: boolean;
  safe: boolean;
}) {
  const { locale, t } = useLocalization();
  const { palette } = useAppTheme();
  const baseline = useRef({
    sessionId: session.state.sessionId,
    count: session.state.hintUseCount,
  });
  const pending = useRef<TechniqueCode | null>(null);
  const [text, setText] = useState<TechniqueCode | null>(null);
  const [claimed, setClaimed] = useState(false);
  useEffect(() => {
    if (baseline.current.sessionId !== session.state.sessionId) {
      baseline.current = {
        sessionId: session.state.sessionId,
        count: session.state.hintUseCount,
      };
      pending.current = null;
      setText(null);
      setClaimed(false);
      return;
    }
    if (session.state.hintUseCount > baseline.current.count) {
      pending.current =
        session.state.hintExposures?.at(-1)?.step.techniqueCode ?? null;
      baseline.current.count = session.state.hintUseCount;
    }
  }, [session]);
  useEffect(() => {
    if (!enabled || !safe) {
      setText(null);
      return;
    }
    if (claimed || !pending.current) return;
    let live = true;
    // Any accepted input/revision restarts this quiet period.
    const timer = setTimeout(() => {
      controller
        .claimFeedback(session.state.sessionId)
        .then(accepted => {
          if (!live) return;
          setClaimed(true);
          if (accepted) setText(pending.current);
          pending.current = null;
        })
        .catch(() => undefined);
    }, 1500);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [
    controller,
    enabled,
    safe,
    claimed,
    session.state.sessionId,
    session.state.revision,
  ]);
  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(() => setText(null), GROWTH_POLICY.feedbackMs);
    return () => clearTimeout(timer);
  }, [text]);
  return (
    <View pointerEvents="none" style={styles.slot}>
      {text && enabled && safe ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.text, { color: palette.muted }]}
        >
          {t('growth.light', {
            technique: HINT_PRESENTATION_COPIES[locale].techniques[text].name,
          })}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  slot: { height: 54, justifyContent: 'center' },
  text: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
