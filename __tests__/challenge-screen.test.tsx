import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import { ChallengeScreen } from '../src/ui/screens/ChallengeScreen';
import { GameScreen } from '../src/ui/screens/GameScreen';
import { LocalizationProvider } from '../src/localization';
import { ThemeProvider } from '../src/ui/theme';
import { DEFAULT_PRODUCT_PREFERENCES } from '../src/application/app/product-preferences';
import { getChallengeCatalog } from '../src/data/challenge/challenge-catalog';
import { createChallengeProgress } from '../src/domain/challenge/engine';
import type {
  ChallengeProgress,
  ChallengeProgressStore,
} from '../src/domain/challenge/contracts';
import { challengeTarget, compositeEdits } from './helpers/challenge';
import { challengeState } from '../src/domain/challenge/engine';
import { hasCandidate } from '../src/domain/sudoku/board';
import NativeHintEngine from '../src/native/NativeHintEngine';
import type { ProductLocale } from '../src/localization/locales';

jest.mock('../src/ui/components/SudokuBoard', () => ({
  ...jest.requireActual('../src/ui/components/SudokuBoard'),
  SudokuBoard: () => null,
}));
jest.mock('../src/native/NativeHintEngine', () => ({
  __esModule: true,
  default: { enumerateSteps: jest.fn(), cancel: jest.fn() },
}));
const catalog = getChallengeCatalog();
let tree: Renderer.ReactTestRenderer;
let store: ChallengeProgressStore;
let rows: Map<string, ChallengeProgress>;
let fail: boolean;
let close: jest.Mock;
const game = () => tree.root.findByType(GameScreen);
const press = async (id: string) => {
  await act(async () => tree.root.findByProps({ testID: id }).props.onPress());
};
async function render(digitFirst = false, locale: ProductLocale = 'zh-Hans') {
  await act(async () => {
    tree = Renderer.create(
      <LocalizationProvider locale={locale}>
        <ThemeProvider preference="light">
          <ChallengeScreen
            store={store}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              inputMode: digitFirst ? 'digit_first' : 'cell_first',
            }}
            onClose={close}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
}
beforeEach(() => {
  rows = new Map();
  fail = false;
  close = jest.fn();
  store = {
    list: async () => [...rows.values()],
    save: async row => {
      if (fail) throw new Error('disk full');
      rows.set(row.levelId, row);
    },
  };
  jest
    .mocked(NativeHintEngine.enumerateSteps)
    .mockImplementation(async (_, board, masks, givens) =>
      JSON.stringify({
        board,
        snapshotKey: `${board}|${masks}|${givens}`,
        complete: true,
        steps: [],
      }),
    );
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  jest.restoreAllMocks();
});

test('direct entry, digit-first callbacks in one event, check, durable next-level access and return', async () => {
  await render(true);
  expect(
    tree.root.findAllByProps({ testID: 'challenge-directory' }),
  ).toHaveLength(0);
  await press('challenge-start');
  const target = challengeTarget(catalog.levels[0]);
  await act(async () => {
    const callbacks = game().props;
    callbacks.onSelectCell(target.cell);
    callbacks.onDigit(target.digit);
  });
  expect(game().props.snapshot.session.state.values[target.cell]).toBe(
    target.digit,
  );
  await press('practice-board-action');
  expect(rows.get('discovery-1')!.everPassed).toBe(true);
  expect(tree.root.findByProps({ testID: 'challenge-passed' })).toBeTruthy();
  await press('challenge-next');
  expect(tree.root.findByProps({ testID: 'challenge-briefing' })).toBeTruthy();
  expect(
    tree.root.findByProps({ testID: 'challenge-level-progress' }).props
      .children,
  ).toEqual([2, ' / ', 6]);
  expect(tree.root.findAllByType(GameScreen)).toHaveLength(0);
  await press('challenge-page-back');
  expect(close).toHaveBeenCalledTimes(1);
});

test('failed save retains draft and blocks false completion; retry applies exactly once', async () => {
  await render();
  await press('challenge-start');
  const target = challengeTarget(catalog.levels[0]);
  await act(async () => {
    const callbacks = game().props;
    callbacks.onSelectCell(target.cell);
    callbacks.onDigit(target.digit);
  });
  fail = true;
  await press('practice-board-action');
  expect(rows.has('discovery-1')).toBe(false);
  expect(tree.root.findAllByProps({ testID: 'challenge-passed' })).toHaveLength(
    0,
  );
  expect(game().props.snapshot.session.state.values[target.cell]).toBe(
    target.digit,
  );
  fail = false;
  await press('practice-board-action');
  expect(rows.get('discovery-1')!.attempt.submissions).toBe(1);
});

test('continuous comprehensive board retains accepted effects after an invalid batch, then passes and restores', async () => {
  for (const level of catalog.levels.slice(0, 5))
    rows.set(level.id, {
      ...createChallengeProgress(level.id, catalog.content_key, level.id),
      everPassed: true,
    });
  await render();
  await press('challenge-start');
  const level = catalog.levels[5];
  const pages = compositeEdits(level);
  const first = pages[0].target!;
  await act(async () =>
    game().props.onEditCandidates([first.cell], [first.digit], 'remove'),
  );
  await press('practice-board-action');
  const accepted = rows.get(level.id)!;
  expect(accepted.attempt.passed).toBe(false);
  const second = pages[1].target!;
  const maskCell = challengeState(
    level,
    accepted.attempt.accepted.map(item => item.operation),
  ).candidates.findIndex(mask => mask > 0);
  // Removing every remaining candidate necessarily includes unsupported effects.
  await act(async () =>
    game().props.onEditCandidates(
      [maskCell],
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      'remove',
    ),
  );
  await press('practice-board-action');
  expect(rows.get(level.id)!.attempt.errors).toBe(1);
  expect(rows.get(level.id)!.attempt.accepted).toEqual(
    accepted.attempt.accepted,
  );
  expect(
    hasCandidate(
      game().props.snapshot.session.state.candidates.quickCandidates[
        first.cell
      ],
      first.digit,
    ),
  ).toBe(false);
  expect(second).toBeDefined();
  for (const page of pages.slice(1, -1)) {
    await act(async () =>
      game().props.onEditCandidates(
        [page.target!.cell],
        [page.target!.digit],
        'remove',
      ),
    );
    await press('practice-board-action');
  }
  await act(async () => game().props.onPencil());
  const target = pages.at(-1)!.snapshot.step.placements[0];
  await act(async () => {
    const callbacks = game().props;
    callbacks.onSelectCell(target.cell);
    callbacks.onDigit(target.digit);
  });
  await press('practice-board-action');
  expect(rows.get(level.id)!.everPassed).toBe(true);
  await act(async () => tree.unmount());
  await render();
  expect(tree.root.findByProps({ testID: 'challenge-result' })).toBeTruthy();
  expect(tree.root.findAllByType(GameScreen)).toHaveLength(0);
  expect(
    tree.root.findByProps({ testID: 'challenge-next' }).props
      .accessibilityLabel,
  ).toBe('完成');
});

test('background saves once, pauses editing, and returning resumes without a save loop', async () => {
  const callbacks: ((state: string) => void)[] = [];
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((type, listener) => {
      if (type === 'change')
        callbacks.push(listener as (state: string) => void);
      return { remove: jest.fn() };
    });
  await render();
  await press('challenge-start');
  await act(async () => callbacks.forEach(callback => callback('background')));
  expect(game().props.practice.actionDisabled).toBe(true);
  expect(game().props.snapshot.busy).toBe(false);
  expect(game().props.practice.readOnly).toBe(true);
  await act(async () => callbacks.forEach(callback => callback('active')));
  expect(game().props.practice.readOnly).toBe(false);
  expect(rows.size).toBeLessThanOrEqual(1);
});

test('comprehensive r9c5 allows every digit, including unsupported guesses, and keeps draft values editable', async () => {
  for (const level of catalog.levels.slice(0, 5))
    rows.set(level.id, {
      ...createChallengeProgress(level.id, catalog.content_key, level.id),
      everPassed: true,
    });
  await render();
  await press('challenge-start');
  await act(async () => game().props.onPencil());
  await act(async () => game().props.onSelectCell(76));
  expect(game().props.practice.pencilLabel).toBe('填数');
  // The initial candidates are 7/8/9. Input must still permit all guesses.
  for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const key = tree.root.findByProps({ testID: `number-key-${digit}` });
    expect(key.props.disabled).toBe(false);
    await press(`number-key-${digit}`);
    expect(game().props.snapshot.session.state.values[76]).toBe(digit);
  }
  await press('number-key-7');
  expect(game().props.snapshot.session.state.values[76]).toBe(7);
  expect(rows.has('discovery-6')).toBe(false);
  expect(game().props.snapshot.session.state.givens[76]).toBeNull();
  await act(async () => game().props.onSelectCell(0));
  for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(
      tree.root.findByProps({ testID: `number-key-${digit}` }).props.disabled,
    ).toBe(true);
  expect(game().props.snapshot.session.state.values[0]).toBe(4);
});

test('an unsupported replacement is judged only on Check, then rolls back and leaves the keyboard usable', async () => {
  for (const level of catalog.levels.slice(0, 5))
    rows.set(level.id, {
      ...createChallengeProgress(level.id, catalog.content_key, level.id),
      everPassed: true,
    });
  await render();
  await press('challenge-start');
  await act(async () => game().props.onPencil());
  await act(async () => game().props.onSelectCell(76));
  await press('number-key-7');
  await press('number-key-1');
  expect(game().props.snapshot.session.state.values[76]).toBe(1);
  expect(rows.has('discovery-6')).toBe(false);
  await press('practice-board-action');
  expect(rows.get('discovery-6')!.attempt.errors).toBe(1);
  expect(rows.get('discovery-6')!.attempt.passed).toBe(false);
  expect(game().props.snapshot.session.state.values[76]).toBeNull();
  await press('number-key-7');
  expect(game().props.snapshot.session.state.values[76]).toBe(7);
  expect(rows.get('discovery-6')!.attempt.errors).toBe(1);
});

test('candidate mode keeps filled cells protected and shows which operation is active', async () => {
  await render();
  await press('challenge-start');
  const target = challengeTarget(catalog.levels[0]);
  await act(async () => game().props.onSelectCell(target.cell));
  await press(`number-key-${target.digit}`);
  expect(game().props.practice.pencilLabel).toBe('填数');
  await press('pencil-tool');
  expect(game().props.practice.pencilLabel).toBe('排除候选');
  expect(
    tree.root.findByProps({ testID: `number-key-${target.digit}` }).props
      .disabled,
  ).toBe(true);
  await press('pencil-tool');
  expect(
    tree.root.findByProps({ testID: `number-key-${target.digit}` }).props
      .disabled,
  ).toBe(false);
});

test('briefing is separate from the shared game board and returning to it preserves edits', async () => {
  await render();
  expect(tree.root.findByProps({ testID: 'challenge-briefing' })).toBeTruthy();
  expect(tree.root.findAllByType(GameScreen)).toHaveLength(0);
  await press('challenge-start');
  expect(
    tree.root.findByProps({ testID: 'challenge-restart' }).props
      .accessibilityLabel,
  ).toBe('重新挑战');
  const target = challengeTarget(catalog.levels[0]);
  await act(async () => game().props.onSelectCell(target.cell));
  await press('number-key-1');
  await act(async () => game().props.onBack());
  expect(tree.root.findAllByType(GameScreen)).toHaveLength(0);
  await press('challenge-start');
  expect(game().props.snapshot.session.state.values[target.cell]).toBe(1);
  expect(rows.get(catalog.levels[0].id)?.attempt.accepted ?? []).toHaveLength(
    0,
  );
});

test('multiple draft values, overwriting, erasing and undo restore each user action', async () => {
  await render();
  await press('challenge-start');
  const cells = [...catalog.levels[0].source.board_fingerprint].flatMap(
    (v, i) => (v === '0' ? [i] : []),
  );
  await act(async () => game().props.onSelectCell(cells[0]));
  await press('number-key-7');
  await press('number-key-8');
  await act(async () => game().props.onSelectCell(cells[1]));
  await press('number-key-1');
  expect(game().props.snapshot.session.state.values[cells[0]]).toBe(8);
  expect(game().props.snapshot.session.state.values[cells[1]]).toBe(1);
  await press('undo-tool');
  expect(game().props.snapshot.session.state.values[cells[1]]).toBeNull();
  await press('undo-tool');
  expect(game().props.snapshot.session.state.values[cells[0]]).toBe(7);
  await act(async () => game().props.onSelectCell(cells[0]));
  await press('erase-tool');
  expect(game().props.snapshot.session.state.values[cells[0]]).toBeNull();
  await press('undo-tool');
  expect(game().props.snapshot.session.state.values[cells[0]]).toBe(7);
  expect(rows.get(catalog.levels[0].id)?.attempt.accepted ?? []).toHaveLength(
    0,
  );
});

test('erasing candidates clears the cell and a single undo restores the whole edit', async () => {
  await render();
  await press('challenge-start');
  const target = challengeTarget(catalog.levels[0]).cell;
  await act(async () => game().props.onSelectCell(target));
  const mask =
    game().props.snapshot.session.state.candidates.quickCandidates[target];
  expect(mask).toBeGreaterThan(0);
  await press('erase-tool');
  expect(
    game().props.snapshot.session.state.candidates.quickCandidates[target],
  ).toBe(0);
  await press('undo-tool');
  expect(
    game().props.snapshot.session.state.candidates.quickCandidates[target],
  ).toBe(mask);
});

test('eliminations and a dependent final fill can be edited together and checked atomically', async () => {
  for (const level of catalog.levels.slice(0, 5))
    rows.set(level.id, {
      ...createChallengeProgress(level.id, catalog.content_key, level.id),
      everPassed: true,
    });
  await render();
  await press('challenge-start');
  const pages = compositeEdits(catalog.levels[5]);
  for (const page of pages.slice(0, -1))
    await act(async () =>
      game().props.onEditCandidates(
        [page.target!.cell],
        [page.target!.digit],
        'remove',
      ),
    );
  const target = pages.at(-1)!.snapshot.step.placements[0];
  await press('pencil-tool');
  await act(async () => game().props.onSelectCell(target.cell));
  await press(`number-key-${target.digit}`);
  expect(game().props.snapshot.session.state.values[target.cell]).toBe(
    target.digit,
  );
  expect(rows.has('discovery-6')).toBe(false);
  await press('practice-board-action');
  expect(rows.get('discovery-6')!.attempt.submissions).toBe(1);
  expect(rows.get('discovery-6')!.everPassed).toBe(true);
  expect(tree.root.findByProps({ testID: 'challenge-result' })).toBeTruthy();
  expect(tree.root.findAllByType(GameScreen)).toHaveLength(0);
});

test('digit-first actual board taps fill, overwrite and remove candidates while protecting clues', async () => {
  await render(true);
  await press('challenge-start');
  const { SudokuBoard } = jest.requireMock('../src/ui/components/SudokuBoard');
  const target = challengeTarget(catalog.levels[0]).cell;
  await press('number-key-7');
  await act(async () =>
    tree.root.findByType(SudokuBoard).props.onSelectCell(target),
  );
  expect(game().props.snapshot.session.state.values[target]).toBe(7);
  await press('number-key-8');
  await act(async () =>
    tree.root.findByType(SudokuBoard).props.onSelectCell(target),
  );
  expect(game().props.snapshot.session.state.values[target]).toBe(8);
  await act(async () => game().props.onErase());
  await press('pencil-tool');
  const mask =
    game().props.snapshot.session.state.candidates.quickCandidates[target];
  const digit = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).find(d =>
    hasCandidate(mask, d),
  )!;
  // Switching modes retains the selected digit; select a different one first.
  await press(`number-key-${digit === 1 ? 2 : 1}`);
  await press(`number-key-${digit}`);
  await act(async () =>
    tree.root.findByType(SudokuBoard).props.onSelectCell(target),
  );
  expect(
    hasCandidate(
      game().props.snapshot.session.state.candidates.quickCandidates[target],
      digit,
    ),
  ).toBe(false);
  await press('undo-tool');
  expect(
    game().props.snapshot.session.state.candidates.quickCandidates[target],
  ).toBe(mask);
  const clue = [...catalog.levels[0].source.board_fingerprint].findIndex(
    v => v !== '0',
  );
  await act(async () =>
    tree.root.findByType(SudokuBoard).props.onSelectCell(clue),
  );
  expect(game().props.snapshot.session.state.values[clue]).toBe(
    Number(catalog.levels[0].source.board_fingerprint[clue]),
  );
  expect(rows.get(catalog.levels[0].id)?.attempt.accepted ?? []).toHaveLength(
    0,
  );
});

test('a saved ended sixth attempt starts through the single Start button without showing legacy actions', async () => {
  for (const level of catalog.levels.slice(0, 5))
    rows.set(level.id, {
      ...createChallengeProgress(level.id, catalog.content_key, level.id),
      everPassed: true,
    });
  const level = catalog.levels[5];
  const previous = createChallengeProgress(
    level.id,
    catalog.content_key,
    'ended-six',
  );
  rows.set(level.id, {
    ...previous,
    solutionViewed: true,
    attempt: { ...previous.attempt, ended: true },
  });
  await render();
  expect(
    tree.root.findByProps({ testID: 'challenge-start' }).props
      .accessibilityLabel,
  ).toBe('开始挑战');
  expect(tree.root.findAllByType(GameScreen)).toHaveLength(0);
  await press('challenge-start');
  expect(rows.get(level.id)!.attempt.ended).toBe(false);
  expect(rows.get(level.id)!.solutionViewed).toBe(true);
  expect(game().props.snapshot.busy).toBe(false);
  expect(game().props.practice.readOnly).toBe(false);
  await act(async () => game().props.onSelectCell(76));
  expect(tree.root.findByProps({ testID: 'number-key-7' }).props.disabled).toBe(
    false,
  );
});

test('only a real pending check shows busy, and completing the save unlocks the sixth board', async () => {
  for (const level of catalog.levels.slice(0, 5))
    rows.set(level.id, {
      ...createChallengeProgress(level.id, catalog.content_key, level.id),
      everPassed: true,
    });
  await render();
  await press('challenge-start');
  const target = compositeEdits(catalog.levels[5])[0].target!;
  await act(async () =>
    game().props.onEditCandidates([target.cell], [target.digit], 'remove'),
  );
  let finish!: () => void;
  const originalSave = store.save;
  store.save = async (row, revision) => {
    await new Promise<void>(resolve => {
      finish = resolve;
    });
    await originalSave(row, revision);
  };
  let check!: Promise<void>;
  await act(async () => {
    check = game().props.practice.onAction();
  });
  expect(game().props.snapshot.busy).toBe(true);
  expect(game().props.practice.actionLabel).toBe('正在检查…');
  await act(async () => {
    finish();
    await check;
  });
  expect(game().props.snapshot.busy).toBe(false);
  expect(game().props.practice.readOnly).toBe(false);
  expect(rows.get('discovery-6')!.attempt.accepted).toHaveLength(1);
});

test('entry shows a fixed Home header, six level buttons and previous beside the primary action', async () => {
  await render();
  expect(tree.root.findByProps({ testID: 'challenge-briefing' })).toBeTruthy();
  expect(
    tree.root.findByProps({ testID: 'challenge-start' }).props
      .accessibilityLabel,
  ).toBe('开始挑战');
  expect(
    tree.root.findByProps({ testID: 'challenge-level-progress' }).props
      .children,
  ).toEqual([1, ' / ', 6]);
  for (const id of [
    'challenge-directory',
    'challenge-restart',
    'challenge-explanation',
    'challenge-next',
  ])
    expect(tree.root.findAllByProps({ testID: id })).toHaveLength(0);
  const scroll = tree.root.findByProps({
    testID: 'challenge-instructions-scroll',
  });
  expect(scroll.findAllByProps({ testID: 'challenge-page-back' })).toHaveLength(
    0,
  );
  expect(scroll.findAllByProps({ testID: 'challenge-start' })).toHaveLength(0);
  await press('challenge-page-back');
  expect(close).toHaveBeenCalledTimes(1);
});

test('reopening after a pass goes directly to the next unpassed briefing', async () => {
  await render();
  await press('challenge-start');
  const target = challengeTarget(catalog.levels[0]);
  await act(async () => {
    game().props.onSelectCell(target.cell);
    game().props.onDigit(target.digit);
  });
  await press('practice-board-action');
  await act(async () => tree.unmount());
  await render();
  expect(
    tree.root.findByProps({ testID: 'challenge-level-progress' }).props
      .children,
  ).toEqual([2, ' / ', 6]);
  expect(tree.root.findAllByProps({ testID: 'challenge-next' })).toHaveLength(
    0,
  );
  expect(
    tree.root.findAllByProps({ testID: 'challenge-explanation' }),
  ).toHaveLength(0);
  await press('challenge-start');
  expect(game().props.practice.title).toContain('2 / 6');
  expect(game().props.practice.next).toBeUndefined();
});

test('Instructions from the board pause at its briefing and Continue keeps the same draft', async () => {
  await render();
  await press('challenge-start');
  const target = challengeTarget(catalog.levels[0]);
  await act(async () => game().props.onSelectCell(target.cell));
  await press('number-key-7');
  await act(async () => game().props.onBack());
  expect(close).not.toHaveBeenCalled();
  expect(
    tree.root.findByProps({ testID: 'challenge-start' }).props
      .accessibilityLabel,
  ).toBe('继续挑战');
  await press('challenge-start');
  expect(game().props.snapshot.session.state.values[target.cell]).toBe(7);
  expect(game().props.snapshot.busy).toBe(false);
});

test('level navigation preserves independent drafts, selected cells, editing modes and undo histories', async () => {
  await render();
  expect(
    tree.root.findByProps({ testID: 'challenge-previous' }).props.disabled,
  ).toBe(true);
  await press('challenge-level-6');
  expect(
    tree.root.findByProps({ testID: 'challenge-level-progress' }).props
      .children,
  ).toEqual([6, ' / ', 6]);
  await press('challenge-start');
  const sixth = catalog.levels[5];
  const target = compositeEdits(sixth)[0].target!;
  await act(async () =>
    game().props.onEditCandidates([target.cell], [target.digit], 'remove'),
  );
  const sixthMasks =
    game().props.snapshot.session.state.candidates.quickCandidates;
  await act(async () => game().props.onBack());
  await press('challenge-previous');
  expect(
    tree.root.findByProps({ testID: 'challenge-level-progress' }).props
      .children,
  ).toEqual([5, ' / ', 6]);
  await press('challenge-level-1');
  await press('challenge-start');
  const firstTarget = challengeTarget(catalog.levels[0]);
  await act(async () => {
    game().props.onSelectCell(firstTarget.cell);
    game().props.onDigit(7);
  });
  await act(async () => game().props.onBack());
  await press('challenge-level-6');
  expect(
    tree.root.findByProps({ testID: 'challenge-start' }).props
      .accessibilityLabel,
  ).toBe('继续挑战');
  await press('challenge-start');
  expect(
    game().props.snapshot.session.state.candidates.quickCandidates,
  ).toEqual(sixthMasks);
  await act(async () => game().props.onUndo());
  expect(
    game().props.snapshot.session.state.candidates.quickCandidates[target.cell],
  ).toBe(sixth.source.candidate_masks[target.cell]);
  await act(async () => game().props.onBack());
  await press('challenge-level-1');
  await press('challenge-start');
  expect(game().props.snapshot.session.state.values[firstTarget.cell]).toBe(7);
  await act(async () => game().props.onDigit(8));
  expect(game().props.snapshot.session.state.values[firstTarget.cell]).toBe(8);
  await act(async () => game().props.onUndo());
  expect(game().props.snapshot.session.state.values[firstTarget.cell]).toBe(7);
  expect(close).not.toHaveBeenCalled();
});

test('passing level six first does not complete the episode; board Back returns to the current briefing', async () => {
  await render();
  await press('challenge-level-6');
  await press('challenge-start');
  for (const step of compositeEdits(catalog.levels[5])) {
    if (step.target) {
      const target = step.target;
      await act(async () =>
        game().props.onEditCandidates([target.cell], [target.digit], 'remove'),
      );
    } else {
      const target = step.snapshot.step.placements[0];
      await act(async () => game().props.onPencil());
      await act(async () => {
        game().props.onSelectCell(target.cell);
        game().props.onDigit(target.digit);
      });
    }
    await press('practice-board-action');
  }
  expect(
    tree.root.findByProps({ testID: 'challenge-next' }).props
      .accessibilityLabel,
  ).toBe('下一关');
  await press('challenge-next');
  expect(
    tree.root.findByProps({ testID: 'challenge-level-progress' }).props
      .children,
  ).toEqual([1, ' / ', 6]);
  await press('challenge-start');
  expect(game().props.practice.backLabel).toBe('返回');
  expect(game().props.practice.info).toBeUndefined();
  await act(async () => game().props.onBack());
  expect(close).not.toHaveBeenCalled();
  expect(tree.root.findByProps({ testID: 'challenge-briefing' })).toBeTruthy();
  await press('challenge-page-back');
  expect(close).toHaveBeenCalledTimes(1);
});

test('revisiting a passed level starts a playable new attempt only on Start and keeps historical passes', async () => {
  await render();
  await press('challenge-start');
  const target = challengeTarget(catalog.levels[0]);
  await act(async () => {
    game().props.onSelectCell(target.cell);
    game().props.onDigit(target.digit);
  });
  await press('practice-board-action');
  const passedId = rows.get(catalog.levels[0].id)!.attempt.id;
  await press('challenge-level-2');
  await press('challenge-previous');
  expect(rows.get(catalog.levels[0].id)!.attempt.id).toBe(passedId);
  await press('challenge-start');
  expect(game().props.practice.readOnly).toBe(false);
  expect(rows.get(catalog.levels[0].id)!.attempt.id).not.toBe(passedId);
  expect(rows.get(catalog.levels[0].id)!.everPassed).toBe(true);
  expect(game().props.snapshot.session.state.values[target.cell]).toBeNull();
});

test('a failed Back save keeps the board and draft; retry returns to the briefing without losing edits', async () => {
  const now = jest.spyOn(performance, 'now').mockReturnValue(100);
  await render();
  await press('challenge-start');
  const target = challengeTarget(catalog.levels[0]);
  await act(async () => {
    game().props.onSelectCell(target.cell);
    game().props.onDigit(7);
  });
  now.mockReturnValue(200);
  fail = true;
  await act(async () => game().props.onBack());
  expect(game().props.snapshot.session.state.values[target.cell]).toBe(7);
  expect(close).not.toHaveBeenCalled();
  fail = false;
  await act(async () => game().props.onBack());
  expect(
    tree.root.findByProps({ testID: 'challenge-level-progress' }).props
      .children,
  ).toEqual([1, ' / ', 6]);
  await press('challenge-start');
  expect(game().props.snapshot.session.state.values[target.cell]).toBe(7);
  await act(async () => game().props.onBack());
  await press('challenge-level-6');
  expect(
    tree.root.findByProps({ testID: 'challenge-level-progress' }).props
      .children,
  ).toEqual([6, ' / ', 6]);
  expect(rows.get(catalog.levels[0].id)!.attempt.elapsedMs).toBe(100);
});

test('each goal names the required pattern and action; optional help starts collapsed and resets on level changes', async () => {
  await render(false, 'en');
  const expected = [
    'Find a Hidden Single, fill in its digit, then check.',
    'Find a Locked Candidates · Pointing pattern. Remove at least one candidate or fill in a digit, then check.',
    'Find a Locked Candidates · Claiming pattern. Remove at least one candidate or fill in a digit, then check.',
    'Find a Naked Pair pattern. Remove at least one candidate or fill in a digit, then check.',
    'Find a Hidden Pair pattern. Remove at least one candidate or fill in a digit, then check.',
    'Use this episode’s techniques to find a digit you can place. Fill it in, then check.',
  ];
  for (let index = 0; index < expected.length; index++) {
    await press(`challenge-level-${index + 1}`);
    expect(
      tree.root.findByProps({ testID: 'challenge-goal' }).props.children,
    ).toBe(expected[index]);
    expect(
      tree.root.findAllByProps({ testID: 'challenge-help-content' }),
    ).toHaveLength(0);
    expect(
      tree.root.findByProps({ testID: 'challenge-help-toggle' }).props
        .accessibilityState,
    ).toEqual({ expanded: false });
    const collapsed = JSON.stringify(tree.toJSON());
    expect(collapsed).not.toContain('Recognize the pattern');
    expect(collapsed).not.toContain('Fill digits');
    expect(collapsed).not.toContain('Check answer');
    await press('challenge-help-toggle');
    expect(
      tree.root.findByProps({ testID: 'challenge-help-content' }),
    ).toBeTruthy();
    expect(
      tree.root.findByProps({ testID: 'challenge-help-toggle' }).props
        .accessibilityState,
    ).toEqual({ expanded: true });
    if (index === 5) {
      const expanded = JSON.stringify(tree.toJSON());
      expect(expanded).toContain(
        'Hidden Single · Locked Candidates · Pointing · Locked Candidates · Claiming · Naked Pair · Hidden Pair',
      );
      await press('challenge-help-toggle');
      expect(
        tree.root.findAllByProps({ testID: 'challenge-help-content' }),
      ).toHaveLength(0);
    }
  }
});

test('filling 7 immediately cleans row, column and box candidates; replacement, undo and erase rebuild them', async () => {
  await render();
  await press('challenge-level-6');
  await press('challenge-start');
  await press('pencil-tool');
  await act(async () => game().props.onSelectCell(76));
  const baseline = catalog.levels[5].source.candidate_masks;
  await press('number-key-7');
  expect(
    hasCandidate(
      game().props.snapshot.session.state.candidates.quickCandidates[58],
      7,
    ),
  ).toBe(false);
  await press('number-key-8');
  expect(
    hasCandidate(
      game().props.snapshot.session.state.candidates.quickCandidates[58],
      7,
    ),
  ).toBe(true);
  expect(
    hasCandidate(
      game().props.snapshot.session.state.candidates.quickCandidates[72],
      8,
    ),
  ).toBe(false);
  await press('undo-tool');
  expect(
    hasCandidate(
      game().props.snapshot.session.state.candidates.quickCandidates[58],
      7,
    ),
  ).toBe(false);
  await press('erase-tool');
  expect(
    game().props.snapshot.session.state.candidates.quickCandidates,
  ).toEqual(baseline);
  await press('number-key-7');
  await act(async () => game().props.onBack());
  expect(close).not.toHaveBeenCalled();
  expect(
    tree.root.findAllByProps({ testID: 'practice-board-info' }),
  ).toHaveLength(0);
  await press('challenge-start');
  expect(game().props.snapshot.session.state.values[76]).toBe(7);
  await press('practice-board-action');
  expect(rows.get('discovery-6')!.everPassed).toBe(true);
  expect(rows.get('discovery-6')!.attempt.errors).toBe(0);
  expect(NativeHintEngine.enumerateSteps).not.toHaveBeenCalled();
});

test('reported box eliminations are progress, not completion; filling a digit records a durable sixth checkmark', async () => {
  await render();
  await press('challenge-level-6');
  await press('challenge-start');
  await act(async () => game().props.onEditCandidates([31, 32], [3], 'remove'));
  await press('practice-board-action');
  expect(rows.get('discovery-6')!.attempt.accepted).toHaveLength(2);
  expect(rows.get('discovery-6')!.everPassed).toBe(false);
  expect(
    tree.root.findByProps({ testID: 'challenge-feedback' }).props
      .accessibilityLabel,
  ).toBe('候选排除正确。还需填入一个确定的数字并检查，才能通关。');
  expect(tree.root.findAllByProps({ testID: 'challenge-result' })).toHaveLength(
    0,
  );
  await act(async () => game().props.onBack());
  expect(
    tree.root.findAllByProps({ testID: 'challenge-level-6-passed' }),
  ).toHaveLength(0);
  await press('challenge-start');
  await act(async () => {
    game().props.onPencil();
  });
  await act(async () => {
    game().props.onSelectCell(76);
    game().props.onDigit(7);
  });
  await press('practice-board-action');
  expect(rows.get('discovery-6')!.everPassed).toBe(true);
  expect(
    tree.root.findByProps({ testID: 'challenge-level-6-passed' }),
  ).toBeTruthy();
  await press('challenge-level-1');
  await press('challenge-level-6');
  expect(
    tree.root.findByProps({ testID: 'challenge-level-6-passed' }),
  ).toBeTruthy();
  await press('challenge-start');
  await press('challenge-restart');
  await act(async () => game().props.onBack());
  expect(
    tree.root.findByProps({ testID: 'challenge-level-6-passed' }),
  ).toBeTruthy();
  await act(async () => tree.unmount());
  await render();
  expect(
    tree.root.findByProps({ testID: 'challenge-level-6-passed' }),
  ).toBeTruthy();
});

test('restart clears accepted edits, errors, draft and undo history only after a successful save', async () => {
  await render();
  await press('challenge-level-6');
  await press('challenge-start');
  await act(async () => game().props.onEditCandidates([31, 32], [3], 'remove'));
  await press('practice-board-action');
  await act(async () => game().props.onPencil());
  await act(async () => {
    game().props.onSelectCell(76);
    game().props.onDigit(1);
  });
  await press('practice-board-action');
  expect(rows.get('discovery-6')!.attempt.errors).toBe(1);
  await act(async () => game().props.onDigit(7));
  const attemptId = rows.get('discovery-6')!.attempt.id;
  fail = true;
  await press('challenge-restart');
  expect(rows.get('discovery-6')!.attempt.id).toBe(attemptId);
  expect(game().props.snapshot.session.state.values[76]).toBe(7);
  fail = false;
  await press('challenge-restart');
  expect(rows.get('discovery-6')!.attempt.id).not.toBe(attemptId);
  expect(rows.get('discovery-6')!.attempt.errors).toBe(0);
  expect(rows.get('discovery-6')!.attempt.accepted).toHaveLength(0);
  expect(game().props.snapshot.session.state.values[76]).toBeNull();
  expect(
    hasCandidate(
      game().props.snapshot.session.state.candidates.quickCandidates[31],
      3,
    ),
  ).toBe(true);
  expect(
    hasCandidate(
      game().props.snapshot.session.state.candidates.quickCandidates[32],
      3,
    ),
  ).toBe(true);
  await act(async () => game().props.onUndo());
  expect(game().props.snapshot.session.state.values[76]).toBeNull();
  expect(game().props.practice.actionDisabled).toBe(true);
  await act(async () => game().props.onBack());
  await press('challenge-level-1');
  await press('challenge-level-6');
  await press('challenge-start');
  expect(game().props.snapshot.session.state.values[76]).toBeNull();
});
