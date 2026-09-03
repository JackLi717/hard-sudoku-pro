import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ActivityIndicator } from 'react-native';

// This suite mounts the entire app. Its watchdog includes loading native mocks;
// interaction performance is checked by render/SQL work, not suite wall time.
jest.setTimeout(20_000);

const mockRenderCounts: Record<string, number> = {};
jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return {
    ...react,
    memo: (
      component: React.FunctionComponent<object>,
      compare?: (before: object, after: object) => boolean,
    ) => {
      if (!['SudokuCellView', 'CandidateGridView'].includes(component.name)) {
        return react.memo(component, compare);
      }
      return react.memo((props: object) => {
        mockRenderCounts[component.name] =
          (mockRenderCounts[component.name] ?? 0) + 1;
        return component(props);
      }, compare);
    },
  };
});
jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../src/app/production-runtime', () => ({
  createProductionRuntime: jest.fn(),
}));

import {
  OfflineGameCoordinator,
  ProductPreferencesController,
} from '../src/application';
import { UserRepository } from '../src/data/user/user-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { Digit, PuzzleRecord } from '../src/domain';
import { HardSudokuApp } from '../src/ui/HardSudokuApp';
import { NodeSqliteDatabase } from './helpers/node-sqlite';
import { SessionTechniqueReview } from '../src/debug/SessionTechniqueReview';
import { ResultScreen } from '../src/ui/screens/ResultScreen';

const record: PuzzleRecord = {
  id: 'response-audit',
  puzzle:
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  solution:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  difficultyLevel: 3,
  difficultyScore: 300,
  hardestTechnique: 'hiddenSingle',
  ratingVersion: 'test',
  source: 'test',
  contentVersion: 4,
  checksum: 'test',
  enabled: true,
};

async function setup() {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  const players = new UserRepository(database);
  const coordinator = new OfflineGameCoordinator(
    {
      metadata: { contentVersion: 4 },
      getPuzzle: async () => record,
      listPuzzles: async level => (level === 3 ? [record] : []),
    },
    players,
    { nextStep: async () => ({ status: 'solved', reasonKey: 'test' }) },
  );
  await coordinator.initialize();
  await coordinator.requestNewGame(3);
  const preferences = new ProductPreferencesController(players);
  await preferences.initialize();
  await preferences.updatePreferences({
    showTimer: false,
    soundEffects: false,
    haptics: false,
    keepAwake: false,
    locale: 'en',
  });
  return { database, players, coordinator, preferences };
}

async function renderApp(runtime: Awaited<ReturnType<typeof setup>>) {
  jest.spyOn(runtime.coordinator, 'initialize').mockResolvedValue(undefined);
  const runtimeFactory = async () => ({ ...runtime, close: () => undefined });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <HardSudokuApp runtimeFactory={runtimeFactory} />,
    );
  });
  return renderer;
}

test('completed game opens its own diagnostic review and returns with progress intact', async () => {
  const runtime = await setup();
  for (let cell = 0; cell < 81; cell += 1) {
    if (runtime.coordinator.snapshot.session!.state.values[cell] === null) {
      await runtime.coordinator.selectCell(cell);
      await runtime.coordinator.inputDigit(
        Number(record.solution[cell]) as Digit,
      );
    }
  }
  expect(runtime.coordinator.snapshot.screen).toBe('result');
  const before = JSON.stringify(runtime.coordinator.snapshot);
  const sessionId = runtime.coordinator.snapshot.session!.state.sessionId;
  const readSession = jest.fn(async () => []);
  const augmented = {
    ...runtime,
    sessionReview: { readSession, subscribe: () => () => undefined },
  };
  const renderer = await renderApp(augmented);
  await act(async () =>
    renderer.root.findByType(ResultScreen).props.onOpenReview(),
  );
  expect(renderer.root.findByType(SessionTechniqueReview).props.sessionId).toBe(
    sessionId,
  );
  expect(readSession).toHaveBeenCalledWith(sessionId);
  await act(async () =>
    renderer.root.findByType(SessionTechniqueReview).props.onClose(),
  );
  expect(renderer.root.findByType(ResultScreen)).toBeDefined();
  expect(JSON.stringify(runtime.coordinator.snapshot)).toBe(before);
  await act(async () => renderer.unmount());
  runtime.database.close();
});

test('runtime replacement never keeps rendering a disposed coordinator while initialization waits', async () => {
  const runtime = await setup();
  jest.spyOn(runtime.coordinator, 'initialize').mockResolvedValue(undefined);
  const close = jest.fn();
  const firstFactory = async () => ({ ...runtime, close });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <HardSudokuApp runtimeFactory={firstFactory} />,
    );
  });
  let release!: (value: Awaited<ReturnType<typeof firstFactory>>) => void;
  const nextFactory = () =>
    new Promise<Awaited<ReturnType<typeof firstFactory>>>(resolve => {
      release = resolve;
    });
  await act(async () =>
    renderer.update(<HardSudokuApp runtimeFactory={nextFactory} />),
  );
  expect(close).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  expect(renderer.root.findAllByType(SessionTechniqueReview)).toHaveLength(0);
  await act(async () => release({ ...runtime, close }));
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  await act(async () => renderer.unmount());
  runtime.database.close();
});

function holdNextSave(players: UserRepository) {
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const entered = new Promise<void>(resolve => {
    started = resolve;
  });
  const persist = players.persistCommand.bind(players);
  jest
    .spyOn(players, 'persistCommand')
    .mockImplementationOnce(async (...args) => {
      started();
      await gate;
      return persist(...args);
    });
  return { release, entered };
}

function resetRenderCounts() {
  mockRenderCounts.SudokuCellView = 0;
  mockRenderCounts.CandidateGridView = 0;
}

function pressCell(
  renderer: ReactTestRenderer.ReactTestRenderer,
  cell: number,
) {
  renderer.root
    .findByProps({ testID: `sudoku-cell-index-${cell}` })
    .props.onPress();
}

function pressDigit(
  renderer: ReactTestRenderer.ReactTestRenderer,
  digit: number,
) {
  renderer.root
    .find(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith(`Enter ${digit},`),
    )
    .props.onPress();
}

describe('game response performance and input ordering', () => {
  test('updates only affected cells, without rerendering unchanged candidates', async () => {
    const runtime = await setup();
    await runtime.coordinator.toggleQuickPencil();
    await runtime.coordinator.selectCell(2);
    const renderer = await renderApp(runtime);
    resetRenderCounts();
    await act(async () => {
      pressCell(renderer, 3);
    });
    expect(mockRenderCounts.SudokuCellView).toBe(26);
    expect(mockRenderCounts.CandidateGridView).toBe(0);
    resetRenderCounts();
    await act(async () => {
      pressCell(renderer, 5);
    });
    expect(mockRenderCounts.SudokuCellView).toBe(14);
    expect(mockRenderCounts.CandidateGridView).toBe(0);
    resetRenderCounts();
    await act(async () => {
      pressCell(renderer, 5);
    });
    expect(mockRenderCounts.SudokuCellView).toBe(0);
    await act(async () => runtime.coordinator.togglePencil());
    expect(mockRenderCounts.SudokuCellView).toBe(0);
    expect(mockRenderCounts.CandidateGridView).toBe(0);
    expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    await act(async () => renderer.unmount());
    runtime.database.close();
  });

  test.each(['cell_first', 'digit_first'] as const)(
    'accepts fast input in %s mode while an earlier save is pending',
    async inputMode => {
      const runtime = await setup();
      await runtime.preferences.updatePreferences({ inputMode });
      const renderer = await renderApp(runtime);
      const gate = holdNextSave(runtime.players);
      if (inputMode === 'digit_first') {
        await act(async () => pressDigit(renderer, 4));
      }
      await act(async () => {
        pressCell(renderer, 2);
        if (inputMode === 'cell_first') pressDigit(renderer, 4);
        await gate.entered;
      });
      expect(runtime.coordinator.snapshot.busy).toBe(false);
      expect(runtime.coordinator.snapshot.session!.state.values[2]).toBeNull();
      expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
      await act(async () => {
        if (inputMode === 'digit_first') pressDigit(renderer, 6);
      });
      await act(async () => {
        pressCell(renderer, 3);
        if (inputMode === 'cell_first') pressDigit(renderer, 6);
      });
      expect(runtime.coordinator.snapshot.session!.state.selectedCell).toBe(3);
      // Pause is a barrier that drains both inputs and saves the latest focus.
      let paused!: Promise<void>;
      await act(async () => {
        paused = runtime.coordinator.pause();
        gate.release();
        await paused;
      });
      expect(runtime.coordinator.snapshot.session!.state).toMatchObject({
        status: 'paused',
        selectedCell: 3,
      });
      expect(
        runtime.coordinator.snapshot.session!.state.values.slice(2, 4),
      ).toEqual([4, 6]);
      expect(
        runtime.coordinator.snapshot.session!.history.map(move => move.cell),
      ).toEqual([2, 3]);
      const restored = await runtime.players.restoreUnfinishedSession(
        4,
        Date.now(),
      );
      expect(restored.status).toBe('ready');
      if (restored.status === 'ready') {
        expect(restored.session.state.values.slice(2, 4)).toEqual([4, 6]);
        expect(restored.session.state.selectedCell).toBe(3);
      }
      await act(async () => renderer.unmount());
      runtime.database.close();
    },
  );

  test('queues pencil toggles, candidate edits and undo in their original order', async () => {
    const { coordinator, players, database } = await setup();
    await coordinator.selectCell(2);
    const gate = holdNextSave(players);
    const first = coordinator.togglePencil();
    await gate.entered;
    const candidate = coordinator.inputDigit(4);
    const off = coordinator.togglePencil();
    const placed = coordinator.inputDigit(4);
    const undo = coordinator.undo();
    gate.release();
    await Promise.all([first, candidate, off, placed, undo]);
    const state = coordinator.snapshot.session!.state;
    expect(state.candidates.pencilMode).toBe(false);
    expect(state.values[2]).toBeNull();
    expect(state.candidates.manualCandidates[2]).toBe(8);
    expect(
      coordinator.snapshot.session!.history.map(move => move.kind),
    ).toEqual(['edit_manual_candidate']);
    database.close();
  });

  test('discards dependent queued actions after save failure and permits a retry', async () => {
    const { coordinator, players, database } = await setup();
    await coordinator.selectCell(2);
    jest
      .spyOn(players, 'persistCommand')
      .mockRejectedValueOnce(new Error('disk failure'));
    await Promise.all([coordinator.togglePencil(), coordinator.inputDigit(4)]);
    expect(coordinator.snapshot.message?.code).toBe('unexpected_error');
    expect(coordinator.snapshot.session!.state.values[2]).toBeNull();
    expect(coordinator.snapshot.session!.state.candidates.pencilMode).toBe(
      false,
    );
    expect(coordinator.snapshot.session!.history).toHaveLength(0);
    await coordinator.inputDigit(4);
    expect(coordinator.snapshot.session!.state.values[2]).toBe(4);
    expect(coordinator.snapshot.message).toBeNull();
    database.close();
  });

  test('keeps SQL work constant through 200 moves, mode changes, undo and restart', async () => {
    const { coordinator, players, database } = await setup();
    await coordinator.selectCell(2);
    await coordinator.togglePencil();
    const run = jest.spyOn(database, 'run');
    const query = jest.spyOn(database, 'query');
    const counts: number[] = [];
    for (let index = 0; index < 200; index += 1) {
      run.mockClear();
      query.mockClear();
      await coordinator.inputDigit(4);
      counts.push(run.mock.calls.length + query.mock.calls.length);
    }
    expect(new Set(counts)).toEqual(new Set([4]));
    run.mockClear();
    query.mockClear();
    await coordinator.togglePencil();
    expect(run.mock.calls.length + query.mock.calls.length).toBe(3);
    expect(run.mock.calls.some(([sql]) => sql.includes('game_moves'))).toBe(
      false,
    );
    run.mockClear();
    query.mockClear();
    await coordinator.undo();
    expect(run.mock.calls.length + query.mock.calls.length).toBe(4);
    const priorIds = coordinator.snapshot.session!.history.map(move => move.id);
    await coordinator.inputDigit(4);
    const restored = await players.restoreUnfinishedSession(4, Date.now());
    expect(restored.status).toBe('ready');
    if (restored.status === 'ready') {
      expect(restored.session.history).toHaveLength(200);
      expect(
        restored.session.history.slice(0, -1).map(move => move.id),
      ).toEqual(priorIds);
      expect(restored.session.history.at(-1)?.kind).toBe('place_value');
      expect(restored.session.state.values[2]).toBe(4);
    }
    expect(await database.query('PRAGMA integrity_check')).toEqual([
      { integrity_check: 'ok' },
    ]);
    database.close();
  });
});
