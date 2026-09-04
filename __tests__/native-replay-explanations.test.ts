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
  expect(NativeHintEngine.enumerateSteps).toHaveBeenCalledTimes(2);
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
