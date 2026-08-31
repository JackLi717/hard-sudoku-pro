import { Spec as NativeHintEngineModule } from '../src/native/NativeHintEngine';

jest.mock('../src/native/NativeHintEngine', () => ({
  __esModule: true,
  default: {},
}));

import {
  HintCancelledError,
  ReactNativeHintEngine,
} from '../src/domain/hints/native-engine';
import { createHintCandidates } from '../src/domain/hints/candidate-state';
import { boardFromFingerprint } from '../src/domain/sudoku/board';
import { HintEngineRequest } from '../src/domain/hints/contracts';

const almostSolved =
  '534678910672195348198342567859761423426853791713924856961537284287419635345286179';

function request(): HintEngineRequest {
  return {
    contractVersion: 1,
    boardFingerprint: almostSolved,
    hintCandidates: createHintCandidates(boardFromFingerprint(almostSolved)),
    givenCells: [...almostSolved].map(value => value !== '0'),
  };
}

function moduleWith(nextStep: NativeHintEngineModule['nextStep']) {
  return {
    nextStep,
    cancel: jest.fn(),
  } as unknown as NativeHintEngineModule;
}

describe('ReactNativeHintEngine', () => {
  it('encodes the request and validates a structured native step', async () => {
    const nextStep = jest.fn(async () =>
      JSON.stringify({
        status: 'step',
        step: {
          contractVersion: 1,
          boardFingerprint: almostSolved,
          techniqueCode: 'fullHouse',
          difficultyLevel: 1,
          focusCells: [8],
          focusRegions: [{ kind: 'row', index: 0 }],
          premiseCandidates: [],
          eliminations: [],
          placements: [{ cell: 8, digit: 2 }],
          explanationKey: 'hint.fullHouse',
          explanationParams: {},
        },
      }),
    );
    const nativeModule = moduleWith(nextStep);

    const result = await new ReactNativeHintEngine(nativeModule).nextStep(
      request(),
    );

    expect(result.status).toBe('step');
    expect(nextStep).toHaveBeenCalledWith(
      expect.stringMatching(/^hint-\d+$/),
      almostSolved,
      request().hintCandidates.join(','),
      request()
        .givenCells?.map(value => (value ? '1' : '0'))
        .join(''),
    );
  });

  it('cancels an in-flight native request through AbortSignal', async () => {
    let finish: ((value: string) => void) | undefined;
    const nextStep = jest.fn(
      () =>
        new Promise<string>(resolve => {
          finish = resolve;
        }),
    );
    const nativeModule = moduleWith(nextStep);
    const controller = new AbortController();
    const pending = new ReactNativeHintEngine(nativeModule).nextStep(
      request(),
      {
        signal: controller.signal,
      },
    );

    controller.abort();
    finish?.(
      JSON.stringify({ status: 'cancelled', reasonKey: 'hint.cancelled' }),
    );

    await expect(pending).rejects.toBeInstanceOf(HintCancelledError);
    expect(nativeModule.cancel).toHaveBeenCalledWith(
      expect.stringMatching(/^hint-\d+$/),
    );
  });

  it('rejects malformed native output', async () => {
    const nativeModule = moduleWith(jest.fn(async () => 'not-json'));

    await expect(
      new ReactNativeHintEngine(nativeModule).nextStep(request()),
    ).rejects.toThrow('invalid JSON');
  });

  it('rejects a malformed native step before domain validation', async () => {
    const nativeModule = moduleWith(
      jest.fn(async () => JSON.stringify({ status: 'step', step: {} })),
    );

    await expect(
      new ReactNativeHintEngine(nativeModule).nextStep(request()),
    ).rejects.toThrow('invalid result');
  });
});
