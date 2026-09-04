import { Digit } from '../src/domain/sudoku/contracts';
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

test('publishes a detached verified proof before completion and retains it on cancellation', async () => {
  const { q, enumerate } = fixture();
  let cancel = false;
  let finished = false;
  let calls = 0;
  const callback = jest.fn(progress => {
    expect(finished).toBe(false);
    expect(calls).toBe(2); // expansion followed by full proof re-verification
    expect(progress.paths[0].stages.at(-1).after.board).toBe(
      q.expectedBoardFingerprint,
    );
    expect(progress.paths[0].independentUse).toBe(false);
    cancel = true;
  });
  const report = await searchReasoningPaths(
    q,
    async snapshot => {
      calls++;
      return enumerate(snapshot);
    },
    {},
    () => cancel,
    callback,
  );
  finished = true;
  expect(callback).toHaveBeenCalledTimes(1);
  expect(report.paths).toHaveLength(1);
  expect(report.paths).not.toBe(callback.mock.calls[0][0].paths);
  expect(callback.mock.calls[0][0].limits).toEqual([]);
});

test.each(['failed', 'timeout', 'cancelled'])(
  'never publishes partial proof on %s during verification',
  async boundary => {
    const { q, enumerate } = fixture();
    let calls = 0,
      now = 0,
      cancel = false;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
    const callback = jest.fn();
    try {
      const report = await searchReasoningPaths(
        q,
        async snapshot => {
          if (++calls === 2) {
            if (boundary === 'failed') throw Error('native_failure');
            if (boundary === 'timeout') now = 200;
            if (boundary === 'cancelled') cancel = true;
          }
          return enumerate(snapshot);
        },
        { maxMs: 100 },
        () => cancel,
        callback,
      );
      expect(callback).not.toHaveBeenCalled();
      expect(report.paths).toEqual([]);
      expect(report.limits).toContain(
        boundary === 'timeout'
          ? 'time_budget'
          : boundary === 'failed'
          ? 'native_failure'
          : 'cancelled',
      );
      expect(report.limits).not.toContain('reverification_failed');
    } finally {
      clock.mockRestore();
    }
  },
);

(process.env.BEHAVIOR_NATIVE_REPLAY ? test : test.skip).each([
  'digit-cycle',
  'transpose',
  'rotate',
])(
  'target-path search generalizes under %s without cell or digit special cases',
  async transform => {
    const original =
      '030010050007520010020600030004000825270800003009240600000052000602009500000000000';
    const cell = (c: number) =>
      transform === 'transpose'
        ? (c % 9) * 9 + Math.floor(c / 9)
        : transform === 'rotate'
        ? 80 - c
        : c;
    const digit = (d: number) =>
      transform === 'digit-cycle' && d ? (d % 9) + 1 : d;
    const array = Array<string>(81);
    [...original].forEach((d, c) => {
      array[cell(c)] = String(digit(Number(d)));
    });
    const board = array.join('');
    const expected = [...board];
    expected[cell(61)] = String(digit(6));
    const q: GrowthAnalysisRequest = {
      sessionId: 'transformed',
      segmentId: 'transformed',
      requestId: 'transformed',
      startingRevision: 1,
      issuedRevision: 2,
      startingBoardFingerprint: board,
      expectedBoardFingerprint: expected.join(''),
      growthCandidates: createSolverCandidates(boardFromFingerprint(board)),
      givenCells: [...board].map(d => d !== '0'),
      observedEffects: [
        { kind: 'placement', cell: cell(61), digit: digit(6) as Digit },
      ],
    };
    const onVerified = jest.fn();
    const report = await searchReasoningPaths(
      q,
      native,
      { maxExpanded: 8, maxPaths: 1, maxMs: 5000 },
      () => false,
      onVerified,
    );
    expect(report.paths).toHaveLength(1);
    expect(report.paths[0].stages.length).toBeGreaterThan(1);
    expect(report.paths[0].stages.at(-1)?.after.board[cell(61)]).toBe(
      String(digit(6)),
    );
    expect(onVerified).toHaveBeenCalledTimes(1);
  },
  15000,
);
