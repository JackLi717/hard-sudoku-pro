import { spawnSync } from 'node:child_process';
import { HintStep } from '../src/domain/hints/contracts';
import {
  GrowthAnalysisRequest,
  NormalizedPlayerEffect,
} from '../src/domain/technique-recognition/contracts';
import {
  searchReasoningPaths,
  ReasoningEnumerator,
} from '../src/application/technique-recognition/reasoning-paths';

// Frozen pre-action candidate facts. No solution is passed to the search.
const cases: {
  name: string;
  board: string;
  givens: string;
  masks: number[];
  effects: NormalizedPlayerEffect[];
}[] = [
  {
    name: 'two column-nine deletions',
    givens:
      '100000000000001110010101001101100000000000001100010110000010000010111000100001110',
    board:
      '400600000000403120030201648108764200304100006700030410200010004040927000800346592',
    masks: [
      0, 211, 83, 0, 464, 272, 324, 84, 340, 304, 240, 112, 0, 464, 0, 0, 0,
      336, 272, 0, 80, 0, 336, 0, 0, 0, 0, 0, 272, 0, 0, 0, 0, 0, 20, 276, 0,
      274, 0, 0, 272, 274, 192, 192, 0, 0, 306, 306, 144, 0, 402, 0, 0, 272, 0,
      352, 356, 144, 0, 144, 68, 100, 0, 48, 0, 53, 0, 0, 0, 132, 164, 5, 0, 65,
      65, 0, 0, 0, 0, 0, 0,
    ],
    effects: [
      { kind: 'elimination' as const, cell: 46, digit: 9 },
      { kind: 'elimination' as const, cell: 55, digit: 9 },
    ],
  },
  {
    name: 'omitted elimination followed by hidden pair',
    givens:
      '000011000101010110100000100010100100001011000000110000000011110000100000010000000',
    board:
      '040628700768195423592734100030469207206317000479582000624853971900201000010906002',
    masks: [
      5, 0, 5, 0, 0, 0, 0, 272, 272, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 160, 160, 129, 0, 17, 0, 0, 0, 0, 145, 0, 0, 144, 0, 0, 0, 0, 144,
      264, 408, 0, 0, 0, 0, 0, 0, 36, 37, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 144,
      84, 0, 72, 0, 180, 188, 184, 132, 0, 84, 0, 72, 0, 148, 156, 0,
    ],
    effects: [
      { kind: 'elimination' as const, cell: 44, digit: 4 },
      { kind: 'elimination' as const, cell: 44, digit: 8 },
    ],
  },
];
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
  const value = JSON.parse(r.stdout);
  return {
    ...value,
    steps: value.steps.map((item: { step: HintStep }) => item.step),
  };
};
const nativeTest = process.env.BEHAVIOR_NATIVE_REPLAY ? test : test.skip;
nativeTest.each(cases)(
  '$name: bounded search explains without inventing observations',
  async c => {
    const q: GrowthAnalysisRequest = {
      sessionId: c.name,
      segmentId: 'frozen',
      requestId: 'snapshot',
      startingRevision: 1,
      issuedRevision: 2,
      startingBoardFingerprint: c.board,
      expectedBoardFingerprint: c.board,
      growthCandidates: c.masks,
      givenCells: [...c.givens].map(v => v === '1'),
      observedEffects: c.effects,
      hintAssistance: {
        exposureComplete: true,
        knownSources: [],
        appliedSources: [],
        affectedEffects: [],
      },
    };
    const direct = await searchReasoningPaths(q, native, {
      maxDepth: 1,
      maxPaths: 1,
    });
    expect(direct.paths).toEqual([]);
    const r = await searchReasoningPaths(q, native, {
      maxPaths: 1,
      maxDepth: c === cases[1] ? 2 : 5,
    });
    expect({ count: r.paths.length, limits: r.limits }).toMatchObject({
      count: 1,
    });
    const p = r.paths[0];
    if (c === cases[1]) {
      expect(p.stages).toHaveLength(2);
      expect(p.stages[1].step.techniqueCode).toBe('hiddenPair');
    }
    expect(p.stages.length).toBeGreaterThan(1);
    expect(p.totalHumanCost).toBe(
      p.stages.reduce((n, s) => n + s.step.humanCost!, 0),
    );
    expect(p.stages.flatMap(s => s.unobservedEffects).length).toBeGreaterThan(
      0,
    );
    expect(p.independentUse).toBe(false);
    expect(r.automaticTechnique).toBeNull();
    const wrong = await searchReasoningPaths(
      {
        ...q,
        observedEffects: [
          {
            kind: 'elimination',
            cell: c === cases[0] ? 28 : 43,
            digit: c === cases[0] ? 9 : 4,
          },
        ],
      },
      native,
      { maxExpanded: 8, maxDepth: 2 },
    );
    expect(wrong.paths).toEqual([]);
  },
  60000,
);
