jest.mock('../src/native/NativeHintEngine', () => ({
  __esModule: true,
  default: { enumerateSteps: jest.fn(), cancel: jest.fn() },
}));
import NativeHintEngine from '../src/native/NativeHintEngine';
import { explainReplayMove } from '../src/application/game/native-replay-explanations';
import { teachingFixture } from './helpers/replay';

test('native wrapper is unpacked and reverified into a teaching path', async () => {
  const { session, step } = teachingFixture();
  (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
    async (_id, board, candidates, givens) =>
      JSON.stringify({
        board,
        snapshotKey: `${board}|${candidates}|${givens}`,
        complete: true,
        steps: [{ status: 'step', step }],
      }),
  );
  const result = await explainReplayMove(
    session,
    session.history[0],
    new AbortController().signal,
  );
  expect(result.paths).toHaveLength(1);
  expect(result.paths[0].stages[0].step).toEqual(step);
  expect(result.paths[0].independentUse).toBe(false);
  expect(NativeHintEngine.enumerateSteps).toHaveBeenCalledTimes(1);
});

test('cancel reaches native and rejects late enumeration', async () => {
  const { session } = teachingFixture();
  const controller = new AbortController();
  let finish!: (s: string) => void;
  (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  const pending = explainReplayMove(
    session,
    session.history[0],
    controller.signal,
  );
  controller.abort();
  finish('{}');
  const report = await pending;
  expect(NativeHintEngine.cancel).toHaveBeenCalled();
  expect(report.paths).toEqual([]);
  expect(report.limits).toContain('cancelled');
});

test('tiers reuse complete evidence while each path still passes verification; session identity invalidates it', async () => {
  jest.clearAllMocks();
  const { session, step } = teachingFixture();
  (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
    async (_id, board, candidates, givens) =>
      JSON.stringify({
        board,
        snapshotKey: `${board}|${candidates}|${givens}`,
        complete: true,
        steps: [{ step }],
      }),
  );
  const onVerified = jest.fn();
  for (const level of ['basic', 'advanced', 'expert'] as const) {
    const report = await explainReplayMove(
      session,
      session.history[0],
      new AbortController().signal,
      { level, onVerified },
    );
    expect(report.paths).toHaveLength(1);
    expect(report.paths[0].stages[0].step).toEqual(step);
  }
  expect(NativeHintEngine.enumerateSteps).toHaveBeenCalledTimes(1);
  expect(onVerified).toHaveBeenCalledTimes(3);
  await explainReplayMove(
    { ...session },
    session.history[0],
    new AbortController().signal,
  );
  expect(NativeHintEngine.enumerateSteps).toHaveBeenCalledTimes(2);
});

test.each(['incomplete', 'mismatched', 'malformed'])(
  '%s enumeration is never cached as complete evidence',
  async boundary => {
    jest.clearAllMocks();
    const { session, step } = teachingFixture();
    (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
      async (_id, board, candidates, givens) =>
        JSON.stringify({
          board,
          snapshotKey:
            boundary === 'mismatched'
              ? 'wrong'
              : `${board}|${candidates}|${givens}`,
          complete: boundary !== 'incomplete',
          steps: [{ step: boundary === 'malformed' ? {} : step }],
        }),
    );
    const onVerified = jest.fn();
    for (let i = 0; i < 2; i++) {
      const report = await explainReplayMove(
        session,
        session.history[0],
        new AbortController().signal,
        { onVerified },
      );
      expect(report.paths).toHaveLength(0);
    }
    expect(onVerified).not.toHaveBeenCalled();
    expect(NativeHintEngine.enumerateSteps).toHaveBeenCalledTimes(2);
  },
);

test('only one native invocation is dispatched and cancelled waiters never join its queue', async () => {
  jest.clearAllMocks();
  const { session } = teachingFixture();
  const controllers = Array.from({ length: 3 }, () => new AbortController());
  const completions: (() => void)[] = [];
  (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
    (_id, board, candidates, givens) =>
      new Promise(resolve =>
        completions.push(() =>
          resolve(
            JSON.stringify({
              board,
              snapshotKey: `${board}|${candidates}|${givens}`,
              complete: true,
              steps: [],
            }),
          ),
        ),
      ),
  );
  const first = explainReplayMove(
    session,
    session.history[0],
    controllers[0].signal,
  );
  const stale = explainReplayMove(
    session,
    session.history[0],
    controllers[1].signal,
  );
  const current = explainReplayMove(
    session,
    session.history[0],
    controllers[2].signal,
  );
  expect(NativeHintEngine.enumerateSteps).toHaveBeenCalledTimes(1);
  controllers[0].abort();
  controllers[1].abort();
  completions[0]();
  await first;
  expect((await stale).limits).toContain('cancelled');
  expect(NativeHintEngine.enumerateSteps).toHaveBeenCalledTimes(2);
  completions[1]();
  expect((await current).limits).toEqual([]);
});

test('native error payloads never leak into diagnostics', async () => {
  const { session } = teachingFixture();
  (NativeHintEngine.enumerateSteps as jest.Mock).mockRejectedValueOnce(
    Error('private board payload'),
  );
  const report = await explainReplayMove(
    session,
    session.history[0],
    new AbortController().signal,
  );
  expect(report.limits).toEqual(['native_enumeration_failed']);
});
