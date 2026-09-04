import { spawnSync } from 'node:child_process';
import { HINT_LAB_FIXTURES } from '../src/debug/hint-lab';
import { GrowthAnalysisRequest } from '../src/domain/technique-recognition/contracts';
import { HintStep } from '../src/domain/hints/contracts';
import {
  boardFromFingerprint,
  createSolverCandidates,
} from '../src/domain/sudoku/board';
import {
  searchReasoningPaths,
  applyReasoningStep,
  reasoningSnapshotKey,
  ReasoningSnapshot,
  ReasoningEnumerator,
} from '../src/application/technique-recognition/reasoning-paths';

function request(s: ReasoningSnapshot, step: HintStep): GrowthAnalysisRequest {
  return {
    sessionId: 'paths',
    segmentId: 'segment',
    requestId: 'request',
    startingRevision: 1,
    issuedRevision: 2,
    startingBoardFingerprint: s.board,
    expectedBoardFingerprint: applyReasoningStep(s, step).board,
    growthCandidates: s.candidates,
    givenCells: s.givens,
    observedEffects: [
      ...step.placements.map(e => ({ ...e, kind: 'placement' as const })),
      ...step.eliminations.map(e => ({ ...e, kind: 'elimination' as const })),
    ],
    hintAssistance: {
      exposureComplete: true,
      appliedSources: [],
      knownSources: [],
      affectedEffects: [],
    },
  };
}
const native: ReasoningEnumerator = async s => {
  const r = spawnSync(
    process.env.BEHAVIOR_NATIVE_REPLAY!,
    [
      s.board,
      s.candidates.join(','),
      s.givens.map(v => (v ? '1' : '0')).join(''),
      '--opportunities',
    ],
    { encoding: 'utf8', timeout: 10000, maxBuffer: 32 * 1024 * 1024 },
  );
  if (r.status !== 0) throw Error(r.stderr || r.error?.message);
  const result = JSON.parse(r.stdout);
  return {
    ...result,
    steps: result.steps.map((x: { step: HintStep }) => x.step),
  };
};

(process.env.BEHAVIOR_NATIVE_REPLAY ? test : test.skip)(
  'recorded R7C8=6 finds a verified short path within eight expansions',
  async () => {
    const board =
      '030010050007520010020600030004000825270800003009240600000052000602009500000000000';
    const values = boardFromFingerprint(board);
    const expected = [...board];
    expected[61] = '6';
    const q: GrowthAnalysisRequest = {
      sessionId: 'six-regression',
      segmentId: 'six',
      requestId: 'six',
      startingRevision: 1,
      issuedRevision: 2,
      startingBoardFingerprint: board,
      expectedBoardFingerprint: expected.join(''),
      growthCandidates: createSolverCandidates(values),
      givenCells: values.map(v => v !== null),
      observedEffects: [{ kind: 'placement', cell: 61, digit: 6 }],
    };
    const r = await searchReasoningPaths(q, native, {
      maxExpanded: 8,
      maxPaths: 1,
      maxMs: 5000,
    });
    expect(r.paths).toHaveLength(1);
    expect(r.paths[0].stages.map(s => s.step.techniqueCode)).toEqual([
      'lockedCandidates.pointing',
      'hiddenSingle',
    ]);
    expect(r.paths[0].stages.at(-1)?.after.board[61]).toBe('6');
    expect(r.paths[0].independentUse).toBe(false);
  },
  15000,
);
function fixture() {
  const f = HINT_LAB_FIXTURES[0];
  const s = {
    board: f.boardFingerprint,
    candidates: f.candidateMasks,
    givens: f.givenCells,
  };
  const step = { ...f.step, humanCost: f.step.humanCost ?? 100 };
  const enumerate: ReasoningEnumerator = async state => ({
    board: state.board,
    snapshotKey: reasoningSnapshotKey(state),
    complete: true,
    steps: state.board === s.board ? [step] : [],
  });
  return { s, step, q: request(s, step), enumerate };
}
test.each(HINT_LAB_FIXTURES)(
  'generic path supports $step.techniqueCode',
  async f => {
    const s = {
      board: f.boardFingerprint,
      candidates: f.candidateMasks,
      givens: f.givenCells,
    };
    const step = { ...f.step, humanCost: f.step.humanCost ?? 100 };
    const q = request(s, step),
      frozen = JSON.stringify(q);
    const enumerate: ReasoningEnumerator = process.env.BEHAVIOR_NATIVE_REPLAY
      ? native
      : async state => ({
          board: state.board,
          snapshotKey: reasoningSnapshotKey(state),
          complete: true,
          steps: [step],
        });
    const r = await searchReasoningPaths(q, enumerate, {
      maxDepth: 1,
      maxPaths: 1,
    });
    expect(r.paths).toHaveLength(1);
    expect(r.paths[0].independentUse).toBe(false);
    expect(r.paths[0].totalHumanCost).toBeGreaterThan(0);
    expect(JSON.stringify(q)).toBe(frozen);
    expect(r.automaticTechnique).toBeNull();
  },
);
test.each(['board', 'snapshotKey', 'complete'] as const)(
  'rejects invalid %s',
  async field => {
    const { q, enumerate } = fixture();
    const r = await searchReasoningPaths(q, async s => ({
      ...(await enumerate(s)),
      [field]: field === 'complete' ? false : 'wrong',
    }));
    expect(r.paths).toHaveLength(0);
    expect(r.limits.length).toBeGreaterThan(0);
  },
);
test('revalidates proof before publishing', async () => {
  const { q, enumerate } = fixture();
  let calls = 0;
  const r = await searchReasoningPaths(q, async s => ({
    ...(await enumerate(s)),
    steps: ++calls === 1 ? (await enumerate(s)).steps : [],
  }));
  expect(r.paths).toHaveLength(0);
  expect(r.limits).toContain('reverification_failed');
});
test('cancellation and invalid budget never publish', async () => {
  const { q, enumerate } = fixture();
  expect(
    (await searchReasoningPaths(q, enumerate, {}, () => true)).paths,
  ).toEqual([]);
  expect(
    (await searchReasoningPaths(q, enumerate, { maxDepth: 0 })).limits,
  ).toContain('invalid_budget');
});
test('hint uncertainty and assistance cannot earn independent credit', async () => {
  const { q, enumerate } = fixture();
  const r = await searchReasoningPaths(
    { ...q, hintAssistance: { ...q.hintAssistance!, exposureComplete: false } },
    enumerate,
  );
  expect(r.paths[0].hintStatus).toBe('unknown');
  expect(r.paths[0].independentUse).toBe(false);
  const helped = await searchReasoningPaths(
    {
      ...q,
      hintAssistance: {
        ...q.hintAssistance!,
        affectedEffects: q.observedEffects,
      },
    },
    enumerate,
  );
  expect(helped.paths[0].hintStatus).toBe('possible_hint_dependency');
});
test('wrong target or fingerprint is not explained', async () => {
  const { q, enumerate } = fixture();
  expect(
    (
      await searchReasoningPaths(
        { ...q, expectedBoardFingerprint: '0'.repeat(81) },
        enumerate,
      )
    ).limits,
  ).toContain('board_fingerprint_mismatch');
  expect(
    (
      await searchReasoningPaths(
        { ...q, observedEffects: [{ kind: 'placement', cell: 81, digit: 1 }] },
        enumerate,
      )
    ).paths,
  ).toEqual([]);
});

test('cancel arriving during verification clears results', async () => {
  const { q, enumerate } = fixture();
  let calls = 0;
  const r = await searchReasoningPaths(
    q,
    async s => {
      calls++;
      return enumerate(s);
    },
    {},
    () => calls >= 2,
  );
  expect(r.paths).toEqual([]);
  expect(r.limits).toContain('cancelled');
});

test('budget expiring during proof verification is not a failed proof', async () => {
  const { q, enumerate } = fixture();
  let now = 0,
    calls = 0;
  const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
  try {
    const r = await searchReasoningPaths(
      q,
      async s => {
        if (++calls === 2) now = 1000;
        return enumerate(s);
      },
      { maxMs: 100 },
    );
    expect(r.paths).toEqual([]);
    expect(r.limits).toContain('time_budget');
    expect(r.limits).not.toContain('reverification_failed');
  } finally {
    clock.mockRestore();
  }
});

test('expired time budget and conflicting board do not publish', async () => {
  const { q, enumerate } = fixture();
  let now = 0;
  const clock = jest.spyOn(Date, 'now').mockImplementation(() => (now += 10));
  try {
    expect(
      (await searchReasoningPaths(q, enumerate, { maxMs: 1 })).limits,
    ).toContain('time_budget');
  } finally {
    clock.mockRestore();
  }
  expect(
    (
      await searchReasoningPaths(
        { ...q, startingBoardFingerprint: '11' + '0'.repeat(79) },
        enumerate,
      )
    ).limits,
  ).toContain('invalid_input');
});
