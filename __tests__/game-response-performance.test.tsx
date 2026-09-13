import { GameScreen } from '../src/ui/screens/GameScreen';
import { MultiSelectOnboardingOverlay } from '../src/ui/components/MultiSelectOnboardingOverlay';
import { HomeScreen } from '../src/ui/screens/HomeScreen';
import { SettingsScreen } from '../src/ui/screens/SettingsScreen';
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ActivityIndicator, BackHandler } from 'react-native';

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
  CommercialController,
  NoopAdGateway,
  NoopPurchaseGateway,
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
import {
  ReplayLibraryScreen,
  SessionReplayScreen,
} from '../src/ui/screens/SessionReplayScreen';
import { StatisticsScreen } from '../src/ui/screens/ProductInfoScreens';
import { ThemeProvider } from '../src/ui/theme';
import { CompletionResultPreview } from '../src/debug/CompletionResultPreview';
import { LevelPickerModal } from '../src/ui/components/LevelPickerModal';
import { CreditTopUpModal } from '../src/ui/screens/CommercialScreens';

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

const levelFourRecord: PuzzleRecord = {
  ...record,
  id: 'response-audit-level-4',
  difficultyLevel: 4,
  difficultyScore: 400,
  checksum: 'test-level-4',
};

async function setup() {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  const players = new UserRepository(database);
  const coordinator = new OfflineGameCoordinator(
    {
      metadata: { contentVersion: 4 },
      getPuzzle: async id =>
        [record, levelFourRecord].find(puzzle => puzzle.id === id) ?? null,
      listPuzzles: async level =>
        [record, levelFourRecord].filter(
          puzzle => puzzle.difficultyLevel === level,
        ),
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
  const commercial = new CommercialController(
    new NoopAdGateway(),
    new NoopPurchaseGateway(),
    players,
  );
  return { database, players, coordinator, preferences, commercial };
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

test('three root tabs open their pages and hide during a replay or game', async () => {
  const backSubscription = jest.spyOn(BackHandler, 'addEventListener');
  const runtime = await setup();
  const sessionId = runtime.coordinator.snapshot.session!.state.sessionId;
  await runtime.coordinator.returnHome();
  await runtime.preferences.updatePreferences({
    theme: 'dark',
    replayAnalysisLevel: 'expert',
  });
  const augmented = {
    ...runtime,
    sessionReplay: {
      readReplaySession: runtime.players.readReplaySession.bind(
        runtime.players,
      ),
      listReplaySessions: runtime.players.listReplaySessions.bind(
        runtime.players,
      ),
    },
  };
  const renderer = await renderApp(augmented);
  const tab = (name: string) =>
    renderer.root.findByProps({ testID: `tab-${name}` });
  expect(renderer.root.findByType(ThemeProvider).props.preference).toBe(
    'light',
  );
  expect(tab('home').props.accessibilityState.selected).toBe(true);
  for (const name of ['home', 'replay', 'statistics']) {
    expect(
      renderer.root.findByProps({ testID: `tab-icon-${name}` }).props
        .accessibilityElementsHidden,
    ).toBe(true);
  }
  await act(async () => tab('statistics').props.onPress());
  expect(
    renderer.root.findByType(StatisticsScreen).props.onBack,
  ).toBeUndefined();
  const backPress = backSubscription.mock.calls
    .filter(([name]) => name === 'hardwareBackPress')
    .at(-1)?.[1];
  await act(async () =>
    expect(backPress?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true),
  );
  expect(tab('home').props.accessibilityState.selected).toBe(true);
  await act(async () => tab('statistics').props.onPress());
  await act(async () => tab('replay').props.onPress());
  expect(
    renderer.root.findByType(ReplayLibraryScreen).props.onClose,
  ).toBeUndefined();
  await act(async () =>
    renderer.root.findByType(ReplayLibraryScreen).props.onOpen(sessionId),
  );
  expect(renderer.root.findAllByProps({ testID: 'tab-replay' })).toHaveLength(
    0,
  );
  expect(
    renderer.root.findByType(SessionReplayScreen).props.analysisLevel,
  ).toBeUndefined();
  await act(async () =>
    renderer.root.findByType(SessionReplayScreen).props.onClose(),
  );
  expect(tab('replay').props.accessibilityState.selected).toBe(true);
  await act(async () => tab('home').props.onPress());
  await act(async () => renderer.root.findByType(HomeScreen).props.onResume());
  expect(renderer.root.findAllByProps({ testID: 'tab-home' })).toHaveLength(0);
  await act(async () => renderer.unmount());
  backSubscription.mockRestore();
  runtime.database.close();
});

test('settings choice pages return directly to the settings list', async () => {
  const backSubscription = jest.spyOn(BackHandler, 'addEventListener');
  const runtime = await setup();
  await runtime.coordinator.returnHome();
  const renderer = await renderApp(runtime);
  await act(async () =>
    renderer.root.findByType(HomeScreen).props.onOpenSettings(),
  );
  expect(renderer.root.findByType(SettingsScreen).props.page).toBe('main');

  await act(async () =>
    renderer.root.findByType(SettingsScreen).props.onOpenPage('language'),
  );
  expect(renderer.root.findByType(SettingsScreen).props.page).toBe('language');
  const backPress = backSubscription.mock.calls
    .filter(([name]) => name === 'hardwareBackPress')
    .at(-1)?.[1];
  await act(async () =>
    expect(backPress?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true),
  );
  expect(renderer.root.findByType(SettingsScreen).props.page).toBe('main');

  await act(async () =>
    renderer.root.findByType(SettingsScreen).props.onOpenPage('input'),
  );
  expect(renderer.root.findByType(SettingsScreen).props.page).toBe('input');
  await act(async () =>
    renderer.root.findByType(SettingsScreen).props.onBack(),
  );
  expect(renderer.root.findByType(SettingsScreen).props.page).toBe('main');

  await act(async () =>
    renderer.root.findByType(SettingsScreen).props.onOpenPage('rewards'),
  );
  expect(renderer.root.findByType(SettingsScreen).props.page).toBe('rewards');
  const redeemRewardedAd = jest
    .spyOn(runtime.commercial, 'redeemRewardedAd')
    .mockResolvedValue({ status: 'unavailable', reason: 'not_loaded' });
  await act(async () =>
    renderer.root
      .findByProps({ accessibilityLabel: 'Smart hints, Watch ad · +1' })
      .props.onPress(),
  );
  expect(redeemRewardedAd).toHaveBeenCalledWith(
    'smart_hint',
    'home_credit_store',
  );
  expect(renderer.root.findByType(CreditTopUpModal).props.visible).toBe(false);
  await act(async () =>
    renderer.root
      .findByProps({ accessibilityLabel: 'Quick notes, Watch ad · +1' })
      .props.onPress(),
  );
  expect(redeemRewardedAd).toHaveBeenCalledWith(
    'quick_pencil',
    'home_credit_store',
  );
  expect(renderer.root.findByType(CreditTopUpModal).props.visible).toBe(false);
  await act(async () =>
    renderer.root.findByType(SettingsScreen).props.onBack(),
  );
  expect(renderer.root.findByType(CreditTopUpModal).props.visible).toBe(false);
  expect(renderer.root.findByType(SettingsScreen).props.page).toBe('main');
  redeemRewardedAd.mockRestore();
  await act(async () =>
    renderer.root.findByType(SettingsScreen).props.onBack(),
  );
  expect(renderer.root.findByType(HomeScreen)).toBeTruthy();

  await act(async () => renderer.unmount());
  backSubscription.mockRestore();
  runtime.database.close();
});

test('multi-select developer preview can replay without consuming onboarding', async () => {
  const runtime = await setup();
  await runtime.coordinator.returnHome();
  const renderer = await renderApp(runtime);
  jest.useFakeTimers();
  try {
    await act(async () =>
      renderer.root.findByType(HomeScreen).props.onOpenSettings(),
    );
    const preview = () =>
      renderer.root
        .findByType(SettingsScreen)
        .props.onPreviewMultiSelectOnboarding();
    await act(async () => preview());
    expect(
      renderer.root.findAllByType(MultiSelectOnboardingOverlay),
    ).toHaveLength(1);
    await act(async () => jest.advanceTimersByTime(10_000));
    expect(
      renderer.root.findAllByType(MultiSelectOnboardingOverlay),
    ).toHaveLength(1);
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'multi-select-onboarding-got-it' })
        .props.onPress(),
    );
    expect(
      renderer.root.findAllByType(MultiSelectOnboardingOverlay),
    ).toHaveLength(0);
    await act(async () => preview());
    expect(
      renderer.root.findAllByType(MultiSelectOnboardingOverlay),
    ).toHaveLength(1);
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'multi-select-onboarding-backdrop' })
        .props.onPress(),
    );
    expect(
      renderer.root.findAllByType(MultiSelectOnboardingOverlay),
    ).toHaveLength(0);
    expect(
      runtime.preferences.snapshot.preferences.multiSelectOnboardingSeen,
    ).toBe(false);
    await act(async () =>
      renderer.root.findByType(SettingsScreen).props.onBack(),
    );
    await act(async () =>
      renderer.root.findByType(HomeScreen).props.onResume(),
    );
    expect(
      renderer.root.findByType(GameScreen).props.replayMultiSelectOnboarding,
    ).toBe(true);
    await act(async () =>
      renderer.root
        .findByType(GameScreen)
        .props.onMultiSelectOnboardingReplayUsed(),
    );
    expect(
      renderer.root.findByType(GameScreen).props.replayMultiSelectOnboarding,
    ).toBe(false);
  } finally {
    await act(async () => renderer.unmount());
    jest.useRealTimers();
    runtime.database.close();
  }
});

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

test('completed game opens its formal replay and returns with result intact', async () => {
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
  const augmented = {
    ...runtime,
    sessionReplay: {
      readReplaySession: runtime.players.readReplaySession.bind(
        runtime.players,
      ),
      listReplaySessions: runtime.players.listReplaySessions.bind(
        runtime.players,
      ),
    },
  };
  const renderer = await renderApp(augmented);

  await act(async () =>
    renderer.root.findByType(ResultScreen).props.onOpenReplay(),
  );
  expect(renderer.root.findByType(SessionReplayScreen).props.sessionId).toBe(
    sessionId,
  );
  await act(async () =>
    renderer.root.findByType(SessionReplayScreen).props.onClose(),
  );

  expect(renderer.root.findByType(ResultScreen)).toBeDefined();
  expect(JSON.stringify(runtime.coordinator.snapshot)).toBe(before);
  await act(async () => renderer.unmount());
  runtime.database.close();
});

test.each(['home', 'replay', 'statistics'] as const)(
  'completed game can leave through the %s tab',
  async tab => {
    const runtime = await setup();
    for (let cell = 0; cell < 81; cell += 1) {
      if (runtime.coordinator.snapshot.session!.state.values[cell] === null) {
        await runtime.coordinator.selectCell(cell);
        await runtime.coordinator.inputDigit(
          Number(record.solution[cell]) as Digit,
        );
      }
    }
    const augmented = {
      ...runtime,
      sessionReplay: {
        readReplaySession: runtime.players.readReplaySession.bind(
          runtime.players,
        ),
        listReplaySessions: runtime.players.listReplaySessions.bind(
          runtime.players,
        ),
      },
    };
    const renderer = await renderApp(augmented);
    expect(renderer.root.findByType(ResultScreen)).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'tab-home' }).props.accessibilityState
        .selected,
    ).toBe(true);

    await act(async () =>
      renderer.root.findByProps({ testID: `tab-${tab}` }).props.onPress(),
    );

    expect(runtime.coordinator.snapshot.screen).toBe('home');
    expect(runtime.coordinator.snapshot.session).toBeNull();
    expect(renderer.root.findAllByType(ResultScreen)).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: `tab-${tab}` }).props
        .accessibilityState.selected,
    ).toBe(true);
    if (tab === 'home') {
      expect(renderer.root.findByType(HomeScreen)).toBeTruthy();
    } else if (tab === 'replay') {
      expect(renderer.root.findByType(ReplayLibraryScreen)).toBeTruthy();
    } else {
      expect(renderer.root.findByType(StatisticsScreen)).toBeTruthy();
    }
    await act(async () => renderer.unmount());
    runtime.database.close();
  },
);

test('actual completion page opens the shared picker and directly starts the selected level', async () => {
  const runtime = await setup();
  for (let cell = 0; cell < 81; cell += 1) {
    if (runtime.coordinator.snapshot.session!.state.values[cell] === null) {
      await runtime.coordinator.selectCell(cell);
      await runtime.coordinator.inputDigit(
        Number(record.solution[cell]) as Digit,
      );
    }
  }
  const renderer = await renderApp(runtime);
  expect(renderer.root.findByType(ResultScreen)).toBeTruthy();

  await act(async () =>
    renderer.root
      .findByProps({ testID: 'result-choose-level' })
      .props.onPress(),
  );
  expect(renderer.root.findByType(LevelPickerModal)).toBeTruthy();
  const levelStarted = new Promise<void>(resolve => {
    let unsubscribe: () => void = () => undefined;
    unsubscribe = runtime.coordinator.subscribe(snapshot => {
      if (
        snapshot.screen === 'game' &&
        snapshot.session?.state.difficultyLevel === 4
      ) {
        unsubscribe();
        resolve();
      }
    });
  });
  await act(async () => {
    renderer.root
      .findByProps({ testID: 'level-picker-option-4' })
      .props.onPress();
    await levelStarted;
  });

  expect(renderer.root.findByType(GameScreen)).toBeTruthy();
  expect(runtime.coordinator.snapshot.replacementRequest).toBeNull();
  expect(runtime.coordinator.snapshot.session?.state.difficultyLevel).toBe(4);
  await act(async () => renderer.unmount());
  runtime.database.close();
});

test('completion preview leaves the coordinator and persisted player data unchanged', async () => {
  const runtime = await setup();
  await runtime.coordinator.returnHome();
  const persistedState = async () => {
    const [counts] = await runtime.database.query<{
      sessions: number;
      attempts: number;
      receipts: number;
      rewards: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM game_sessions) AS sessions,
        (SELECT COUNT(*) FROM game_attempts) AS attempts,
        (SELECT COUNT(*) FROM game_action_receipts) AS receipts,
        (SELECT COUNT(*) FROM puzzle_completion_rewards) AS rewards`,
    );
    return {
      counts,
      wallet: await runtime.players.readWallet(),
      progress: await runtime.players.getCompletionProgress(),
      statistics: await runtime.players.getStatistics(),
    };
  };
  const beforeSnapshot = JSON.stringify(runtime.coordinator.snapshot);
  const beforePersisted = await persistedState();
  const renderer = await renderApp(runtime);

  await act(async () =>
    renderer.root.findByType(HomeScreen).props.onOpenSettings(),
  );
  await act(async () =>
    renderer.root.findByType(SettingsScreen).props.onOpenCompletionPreview(),
  );
  expect(renderer.root.findByType(CompletionResultPreview)).toBeTruthy();
  expect(renderer.root.findAllByType(SettingsScreen)).toHaveLength(0);
  await act(async () =>
    renderer.root
      .findByProps({ testID: 'completion-preview-scenario-premium-normal' })
      .props.onPress(),
  );
  expect(renderer.root.findByType(ResultScreen)).toBeTruthy();
  await act(async () =>
    renderer.root.findByProps({ testID: 'result-next-puzzle' }).props.onPress(),
  );
  await act(async () =>
    renderer.root
      .findByProps({ testID: 'result-choose-level' })
      .props.onPress(),
  );
  await act(async () =>
    renderer.root
      .findByProps({ testID: 'level-picker-option-4' })
      .props.onPress(),
  );
  await act(async () =>
    renderer.root.findByProps({ testID: 'result-open-replay' }).props.onPress(),
  );
  await act(async () =>
    renderer.root
      .findByProps({ testID: 'completion-preview-close-result' })
      .props.onPress(),
  );

  expect(renderer.root.findByType(SettingsScreen).props.page).toBe('main');
  expect(JSON.stringify(runtime.coordinator.snapshot)).toBe(beforeSnapshot);
  expect(await persistedState()).toEqual(beforePersisted);
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

test('startup failure offers a retry that creates a fresh runtime', async () => {
  const runtime = await setup();
  jest.spyOn(runtime.coordinator, 'initialize').mockResolvedValue(undefined);
  const close = jest.fn();
  const runtimeFactory = jest
    .fn()
    .mockRejectedValueOnce(new Error('database unavailable'))
    .mockResolvedValueOnce({ ...runtime, close });
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <HardSudokuApp runtimeFactory={runtimeFactory} />,
    );
  });

  expect(
    renderer.root.findByProps({
      children: 'Unable to read your game data right now',
    }),
  ).toBeDefined();
  const retry = renderer.root.findByProps({
    accessibilityLabel: 'Retry',
    accessibilityRole: 'button',
  });

  await act(async () => retry.props.onPress());

  expect(runtimeFactory).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByType(GameScreen)).toHaveLength(1);
  await act(async () => renderer.unmount());
  expect(close).toHaveBeenCalledTimes(1);
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
    // One constant-size event insert is added to each accepted durable command.
    expect(new Set(counts)).toEqual(new Set([5]));
    run.mockClear();
    query.mockClear();
    await coordinator.togglePencil();
    expect(run.mock.calls.length + query.mock.calls.length).toBe(4);
    expect(run.mock.calls.some(([sql]) => sql.includes('game_moves'))).toBe(
      false,
    );
    run.mockClear();
    query.mockClear();
    await coordinator.undo();
    expect(run.mock.calls.length + query.mock.calls.length).toBe(5);
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

test('game choices survive Home and Settings, but a new game starts without stale choices', async () => {
  const runtime = await setup();
  await runtime.preferences.updatePreferences({ inputMode: 'digit_first' });
  const renderer = await renderApp(runtime);
  const digitFour = () =>
    renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityLabel?.startsWith('Enter 4,'),
    );
  await act(async () => digitFour().props.onPress());
  expect(digitFour().props.accessibilityState.selected).toBe(true);
  const sessionId = runtime.coordinator.snapshot.session!.state.sessionId;
  await act(async () => renderer.root.findByType(GameScreen).props.onBack());
  await act(async () =>
    renderer.root.findByType(HomeScreen).props.onOpenSettings(),
  );
  await act(async () =>
    renderer.root
      .findByType(SettingsScreen)
      .props.onChange({ showRemainingDigits: false }),
  );
  await act(async () =>
    renderer.root.findByType(SettingsScreen).props.onBack(),
  );
  await act(async () => renderer.root.findByType(HomeScreen).props.onResume());
  expect(runtime.coordinator.snapshot.session!.state.sessionId).toBe(sessionId);
  expect(digitFour().props.accessibilityState.selected).toBe(true);
  // Mode changes are intentional resets, not accidental navigation losses.
  await act(async () =>
    runtime.preferences.updatePreferences({ inputMode: 'cell_first' }),
  );
  expect(digitFour().props.accessibilityState.selected).toBe(false);
  await act(async () =>
    runtime.preferences.updatePreferences({ inputMode: 'digit_first' }),
  );
  expect(digitFour().props.accessibilityState.selected).toBe(false);
  await act(async () => runtime.coordinator.requestNewGame(3));
  await act(async () => runtime.coordinator.confirmReplacement());
  expect(runtime.coordinator.snapshot.session!.state.sessionId).not.toBe(
    sessionId,
  );
  expect(digitFour().props.accessibilityState.selected).toBe(false);
  act(() => renderer.unmount());
  runtime.database.close();
});
