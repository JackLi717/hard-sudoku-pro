import fixtures from './helpers/played-hint-regressions.json';
import { kiteGame } from './helpers/ipad-hint-assistance';
import { GameSession } from '../src/domain/game/contracts';
import { HintStep } from '../src/domain/hints/contracts';
import { boardFromFingerprint } from '../src/domain/sudoku/board';
import { NormalizedPlayerEffect } from '../src/domain/technique-recognition/contracts';
import {
  rebuildHintAssistance,
  sourceAssists,
} from '../src/application/technique-recognition/hint-assistance';

test.each(fixtures)(
  'real hint context survives prior edits: $sessionId',
  fixture => {
    const base = kiteGame();
    const snapshot = (board: string, quick: number[]) => ({
      ...base.state,
      values: boardFromFingerprint(board),
      incorrectCells: [],
      candidates: { ...base.state.candidates, quickCandidates: quick },
    });
    const session: GameSession = {
      state: {
        ...base.state,
        sessionId: fixture.sessionId,
        givens: boardFromFingerprint(fixture.givens),
        values: boardFromFingerprint(fixture.board),
        activeHint: null,
        hintUseCount: 1,
        hintExposures: [
          { ...fixture.exposure, step: fixture.exposure.step as HintStep },
        ],
      },
      history: fixture.moves.map(m => ({
        ...m,
        kind: m.kind as GameSession['history'][number]['kind'],
        digit: m.digit as GameSession['history'][number]['digit'],
        sessionId: fixture.sessionId,
        techniqueCode: null,
        appliedHint: m.appliedHint as HintStep | null,
        before: snapshot(m.before, m.beforeQuick),
        after: snapshot(m.after, m.afterQuick),
        createdAtEpochMs: m.sequence,
      })),
    };
    for (const anchored of [false, true]) {
      const current = anchored
        ? {
            ...session,
            state: {
              ...session.state,
              hintExposures: session.state.hintExposures!.map(e => ({
                ...e,
                nextMoveSequence: fixture.anchor!,
              })),
            },
          }
        : session;
      const effect = fixture.effect as NormalizedPlayerEffect;
      const assistance = rebuildHintAssistance(current);
      expect(
        assistance.knownHintSources.some(s => sourceAssists(s, effect)),
      ).toBe(true);
      // Serialized restoration cannot depend on a warm in-memory source cache.
      expect(
        rebuildHintAssistance(JSON.parse(JSON.stringify(current))),
      ).toEqual(assistance);
    }
  },
);
