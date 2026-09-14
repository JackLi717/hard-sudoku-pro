jest.mock('../src/native/NativeHintEngine', () => ({
  __esModule: true,
  default: { enumerateSteps: jest.fn(), cancel: jest.fn() },
}));
import NativeHintEngine from '../src/native/NativeHintEngine';
import { analyzeReplayBoard } from '../src/application/game/native-replay-board-analysis';
import { teachingFixture } from './helpers/replay';
import {
  createBoardFingerprint,
  createSolverCandidates,
} from '../src/domain/sudoku/board';

beforeEach(() => jest.clearAllMocks());

test('board analysis enumerates next deductions without an observed move', async () => {
  const { session, step } = teachingFixture();
  const snapshot = session.history[0].before;
  (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
    async (_id, board, candidates, givens) =>
      JSON.stringify({
        board,
        snapshotKey: `${board}|${candidates}|${givens}`,
        complete: true,
        steps: [{ step }],
      }),
  );
  const report = await analyzeReplayBoard(
    session,
    snapshot,
    new AbortController().signal,
  );
  const board = createBoardFingerprint(snapshot.values);
  expect(NativeHintEngine.enumerateSteps).toHaveBeenCalledWith(
    expect.any(String),
    board,
    createSolverCandidates(snapshot.values).join(','),
    session.state.givens.map(value => (value ? '1' : '0')).join(''),
  );
  expect(report.paths.map(path => path.stages[0].step)).toEqual([step]);
  expect(report.paths[0].explainedEffects).toEqual([]);
  expect(report.paths[0].stages[0].unobservedEffects).toEqual([]);
});

test('candidate draft and pencil mode do not change the board-analysis input', async () => {
  const { session, step } = teachingFixture();
  const snapshot = session.history[0].before;
  (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
    async (_id, board, candidates, givens) =>
      JSON.stringify({
        board,
        snapshotKey: `${board}|${candidates}|${givens}`,
        complete: true,
        steps: [{ step }],
      }),
  );
  const notes = {
    ...snapshot,
    candidates: { ...snapshot.candidates, pencilMode: true },
  };
  await analyzeReplayBoard(session, snapshot, new AbortController().signal);
  await analyzeReplayBoard(session, notes, new AbortController().signal);
  const calls = (NativeHintEngine.enumerateSteps as jest.Mock).mock.calls;
  expect(calls[1].slice(1)).toEqual(calls[0].slice(1));
});

test('mismatched native evidence cannot become a suggested next step', async () => {
  const { session, step } = teachingFixture();
  (NativeHintEngine.enumerateSteps as jest.Mock).mockResolvedValue(
    JSON.stringify({
      board: '0'.repeat(81),
      snapshotKey: 'wrong',
      complete: true,
      steps: [{ step }],
    }),
  );
  const report = await analyzeReplayBoard(
    session,
    session.history[0].before,
    new AbortController().signal,
  );
  expect(report.paths).toEqual([]);
  expect(report.limits).toContain('analysis_failed');
});

test('cancelling board analysis cancels native work and drops late results', async () => {
  const { session, step } = teachingFixture();
  const controller = new AbortController();
  let resolve!: (value: string) => void;
  (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
    () => new Promise<string>(finish => (resolve = finish)),
  );
  const pending = analyzeReplayBoard(
    session,
    session.history[0].before,
    controller.signal,
  );
  controller.abort();
  resolve(JSON.stringify({ steps: [{ step }] }));
  const report = await pending;
  expect(NativeHintEngine.cancel).toHaveBeenCalled();
  expect(report.paths).toEqual([]);
  expect(report.limits).toContain('cancelled');
});
