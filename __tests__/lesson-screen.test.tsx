import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { BackHandler, StyleSheet, Text } from 'react-native';
import { LessonController } from '../src/application/lessons/lesson-controller';
import type { PracticeProgressStore } from '../src/domain/practice/progress';
import {
  LessonRepository,
  openBundledLessonRepository,
} from '../src/data/lessons/lesson-repository';
import {
  LessonProgressRepository,
  LESSON_READING_TABLE,
} from '../src/data/user/lesson-progress-repository';
import { LESSON_LOCALES, LessonLocale } from '../src/domain/lessons/contracts';
import { LocalizationProvider } from '../src/localization';
import { LESSON_COPY } from '../src/localization/lesson-copy';
import { LESSON_TECHNIQUE_INTROS } from '../src/localization/lesson-technique-intros';
import {
  ARTICLE_ALTERNATE_DIAGRAMS,
  ARTICLE_LABELS,
  ARTICLE_PATTERN_LABELS,
  ARTICLE_PATTERN_VARIANTS,
  ARTICLE_TECHNIQUES,
  TECHNIQUE_ARTICLE_COPY,
} from '../src/localization/technique-articles';
import { TECHNIQUES } from '../src/domain/hints/techniques';
import { LessonScreen } from '../src/ui/screens/LessonScreen';
import { GameScreen } from '../src/ui/screens/GameScreen';
import {
  bundledPracticeRepository,
  practiceScenesFor,
  type PracticeRepository,
} from '../src/data/practice/practice-catalog';
import { HintWalkthroughPlayer } from '../src/ui/components/HintWalkthroughPlayer';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { TechniquePatternDiagram } from '../src/ui/components/TechniquePatternDiagram';
import { ThemeProvider, darkPalette } from '../src/ui/theme';
import preview from '../src/debug/generated/lesson-preview.json';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

test('hidden single practice checks the placed 5 and explains that move', async () => {
  await render('en', openBundledLessonRepository());
  await press('lesson-technique-hiddenSingle');
  await press('lesson-open-practice');
  expect(tree.root.findByProps({ testID: 'practice-screen' })).toBeTruthy();
  expect(tree.root.findAllByProps({ testID: 'practice-start' })).toHaveLength(
    0,
  );
  for (const number of [1, 2, 3])
    expect(
      tree.root.findByProps({ testID: `practice-select-${number}` }),
    ).toBeTruthy();
  await press('practice-select-3');
  expect(
    tree.root.findByProps({ testID: 'practice-board-exercise' }),
  ).toBeTruthy();
  const startingCandidates =
    tree.root.findByType(GameScreen).props.snapshot.session.state.candidates;
  expect(startingCandidates.activeCandidateSource).toBe('manual');
  expect(
    startingCandidates.manualCandidates.every((mask: number) => mask === 0),
  ).toBe(true);
  await act(async () =>
    tree.root.findByType(GameScreen).props.onSelectCell(62),
  );
  await act(async () => tree.root.findByType(GameScreen).props.onDigit(5));
  expect(
    tree.root.findByType(GameScreen).props.snapshot.session.state.values[62],
  ).toBe(5);
  expect(
    tree.root.findByType(GameScreen).props.snapshot.session.history.at(-1).kind,
  ).toBe('place_value');
  jest.useFakeTimers();
  await act(async () =>
    tree.root.findByType(GameScreen).props.practice.onAction(),
  );
  expect(
    tree.root.findByProps({ testID: 'practice-result-overlay' }),
  ).toBeTruthy();
  expect(tree.root.findByType(GameScreen).props.practice.next.label).toBe(
    'Exercises',
  );
  await act(async () => jest.advanceTimersByTime(2499));
  expect(
    tree.root.findByProps({ testID: 'practice-result-overlay' }),
  ).toBeTruthy();
  await act(async () => jest.advanceTimersByTime(1));
  expect(
    tree.root.findAllByProps({ testID: 'practice-result-overlay' }),
  ).toHaveLength(0);
  jest.useRealTimers();
  await act(async () =>
    tree.root.findByType(GameScreen).props.practice.onAction(),
  );
  expect(
    tree.root.findByType(HintWalkthroughPlayer).props.snapshot.step.placements,
  ).toEqual([{ cell: 62, digit: 5 }]);
  await press('practice-board-proof-continue');
  expect(tree.root.findByProps({ testID: 'practice-screen' })).toBeTruthy();
});

test('naked pair practice collects evidence before a candidate removal', async () => {
  await render('en', openBundledLessonRepository());
  await press('lesson-technique-nakedPair');
  await press('lesson-open-practice');
  await press('practice-start');
  await act(async () =>
    tree.root.findByType(SudokuBoard).props.onSelectCell(72),
  );
  await act(async () =>
    tree.root.findByType(SudokuBoard).props.onSelectCell(80),
  );
  await press('practice-pair-continue');
  await act(async () =>
    tree.root.findByType(SudokuBoard).props.onSelectCell(75),
  );
  await press('practice-digit-6');
  await press('practice-check');
  expect(
    tree.root.findByProps({ testID: 'practice-feedback' }).props.children,
  ).toBe('Exactly. You found a valid deduction.');
});

test('hidden single pilot starts without candidates and supports notes, undo and retry', async () => {
  await render('en', openBundledLessonRepository());
  await press('lesson-technique-hiddenSingle');
  await press('lesson-open-practice');
  await press('practice-select-3');
  await act(async () => tree.root.findByType(GameScreen).props.onQuickPencil());
  expect(
    tree.root.findByType(GameScreen).props.snapshot.session.state.candidates
      .activeCandidateSource,
  ).toBe('quick');
  await act(async () => tree.root.findByType(GameScreen).props.onQuickPencil());
  await act(async () =>
    tree.root.findByType(GameScreen).props.onSelectCell(62),
  );
  await act(async () => tree.root.findByType(GameScreen).props.onDigit(1));
  expect(
    tree.root.findByType(GameScreen).props.snapshot.session.state.values[62],
  ).toBeNull();
  expect(
    tree.root.findByType(GameScreen).props.snapshot.session.state.candidates
      .manualCandidates[62],
  ).toBeGreaterThan(0);
  await act(async () => tree.root.findByType(GameScreen).props.onUndo());
  expect(
    tree.root.findByType(GameScreen).props.snapshot.session.state.candidates
      .manualCandidates[62],
  ).toBe(0);
  await act(async () => tree.root.findByType(GameScreen).props.onPencil());
  await act(async () => tree.root.findByType(GameScreen).props.onDigit(4));
  await act(async () =>
    tree.root.findByType(GameScreen).props.practice.onAction(),
  );
  expect(
    tree.root.findByProps({ testID: 'practice-result-card' }),
  ).toBeTruthy();
  expect(
    tree.root.findAllByProps({ testID: 'practice-result-next' }),
  ).toHaveLength(0);
  await press('practice-result-card');
  expect(
    tree.root.findAllByProps({ testID: 'practice-result-overlay' }),
  ).toHaveLength(0);
  await act(async () => tree.root.findByType(GameScreen).props.onUndo());
  expect(
    tree.root.findByType(GameScreen).props.snapshot.session.state.values[62],
  ).toBeNull();
});

test('a correct response opens the next exercise directly', async () => {
  await render('en', openBundledLessonRepository());
  await press('lesson-technique-hiddenSingle');
  await press('lesson-open-practice');
  await press('practice-select-1');
  const target = practiceScenesFor('hiddenSingle')[1].explanation.placements[0];
  await act(async () =>
    tree.root.findByType(GameScreen).props.onSelectCell(target.cell),
  );
  await act(async () =>
    tree.root.findByType(GameScreen).props.onDigit(target.digit),
  );
  await act(async () =>
    tree.root.findByType(GameScreen).props.practice.onAction(),
  );
  await press('practice-result-next');
  expect(tree.root.findByType(GameScreen).props.practice.title).toContain(
    '· 2',
  );
  expect(
    tree.root.findAllByProps({ testID: 'practice-result-overlay' }),
  ).toHaveLength(0);
});

test('an added exercise appears without changing the practice screen', async () => {
  const extra = {
    ...practiceScenesFor('hiddenSingle')[1],
    id: 'added-exercise',
  };
  const repository: PracticeRepository = {
    list(technique, role) {
      const scenes = bundledPracticeRepository.list(technique, role);
      return technique === 'hiddenSingle' && role === 'exercise'
        ? [...scenes, extra]
        : scenes;
    },
    get(id) {
      return id === extra.id ? extra : bundledPracticeRepository.get(id);
    },
  };
  await render('en', openBundledLessonRepository(), repository);
  await press('lesson-technique-hiddenSingle');
  await press('lesson-open-practice');
  await press('practice-select-4');
  expect(tree.root.findByType(GameScreen).props.practice.title).toContain(
    '· 4',
  );
});

test('checking a hidden single records its stable exercise ID', async () => {
  const recordAttempt = jest.fn().mockResolvedValue({});
  const practiceProgress: PracticeProgressStore = {
    listProgress: async () => [],
    recordAttempt,
  };
  await render(
    'en',
    openBundledLessonRepository(),
    undefined,
    practiceProgress,
  );
  await press('lesson-technique-hiddenSingle');
  await press('lesson-open-practice');
  await press('practice-select-1');
  const scene = practiceScenesFor('hiddenSingle')[1];
  const target = scene.explanation.placements[0];
  await act(async () =>
    tree.root.findByType(GameScreen).props.onSelectCell(target.cell),
  );
  await act(async () =>
    tree.root.findByType(GameScreen).props.onDigit(target.digit),
  );
  await act(async () =>
    tree.root.findByType(GameScreen).props.practice.onAction(),
  );
  expect(recordAttempt).toHaveBeenCalledWith(
    scene.id,
    expect.any(String),
    'correct',
    expect.any(Number),
  );
});

jest.mock('../src/ui/components/SudokuBoard', () => ({
  ...jest.requireActual('../src/ui/components/SudokuBoard'),
  SudokuBoard: () => null,
}));
jest.mock('../src/debug/hint-lab', () => {
  throw new Error('Course UI cannot load Lab');
});
jest.mock('../src/debug/hint-lab-store', () => {
  throw new Error('Course UI cannot access acceptance');
});

let tree: Renderer.ReactTestRenderer;
let database: NodeSqliteDatabase;
let progress: LessonProgressRepository;
let controller: LessonController;
let onClose: jest.Mock;
const content = new LessonRepository(preview);
const SINGLE = 'preview-hidden-single';

beforeEach(async () => {
  database = new NodeSqliteDatabase();
  await database.run(LESSON_READING_TABLE);
  progress = new LessonProgressRepository(database);
  onClose = jest.fn();
});
afterEach(async () => {
  jest.useRealTimers();
  if (tree) await act(async () => tree.unmount());
  database.close();
  jest.restoreAllMocks();
});

async function render(
  locale: LessonLocale = 'en',
  source = content,
  practiceRepository?: PracticeRepository,
  practiceProgress?: PracticeProgressStore,
) {
  controller = new LessonController(source, progress, locale);
  await act(async () => {
    tree = Renderer.create(
      <LocalizationProvider locale={locale}>
        <ThemeProvider preference={locale === 'de' ? 'dark' : 'light'}>
          <LessonScreen
            controller={controller}
            onClose={onClose}
            practiceRepository={practiceRepository}
            practiceProgress={practiceProgress}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
}
async function press(id: string) {
  await act(async () => tree.root.findByProps({ testID: id }).props.onPress());
}
async function finishProof() {
  const count = controller.snapshot.presentation!.pages.length;
  for (let page = 1; page < count; page++) {
    await act(async () =>
      tree.root.findByType(HintWalkthroughPlayer).props.onPageChange(page),
    );
  }
  await press('lesson-show-recap');
}
function contains(text: string) {
  return tree.root
    .findAllByType(Text)
    .some(node => node.props.children === text);
}

function assertButtonContrast(
  button: Renderer.ReactTestInstance,
  label: string,
) {
  const text = button
    .findAllByType(Text)
    .find(node => node.props.children === label)!;
  const foreground = StyleSheet.flatten(text.props.style).color as string;
  const background = StyleSheet.flatten(button.props.style)
    .backgroundColor as string;
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(offset => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  expect(
    (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05),
  ).toBeGreaterThanOrEqual(4.5);
}

test.each(LESSON_LOCALES)(
  'groups the 14 Level 1–3 techniques and opens a compact hub in %s',
  async locale => {
    await render(locale, openBundledLessonRepository());
    const firstLevels = TECHNIQUES.filter(item => item.level <= 3);
    expect(firstLevels).toHaveLength(14);
    for (const level of [1, 2, 3]) {
      const group = tree.root.findByProps({ testID: `lesson-level-${level}` });
      const listedIds = new Set(
        group
          .findAll(
            node =>
              typeof node.props.testID === 'string' &&
              node.props.testID.startsWith('lesson-technique-'),
          )
          .map(node => node.props.testID),
      );
      expect([...listedIds]).toEqual(
        TECHNIQUES.filter(item => item.level === level).map(
          item => `lesson-technique-${item.code}`,
        ),
      );
    }
    for (const technique of firstLevels) {
      expect(
        tree.root.findByProps({ testID: `lesson-technique-${technique.code}` }),
      ).toBeTruthy();
      expect(LESSON_TECHNIQUE_INTROS[locale][technique.code]).toBeTruthy();
    }
    expect(
      tree.root.findAllByProps({ testID: 'lesson-technique-swordfish' }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({ testID: 'lesson-status-xWing' }),
    ).toHaveLength(0);
    expect(contains(LESSON_COPY[locale].close)).toBe(true);
    await press('lesson-technique-xWing');
    expect(tree.root.findByProps({ testID: 'lesson-hub' })).toBeTruthy();
    expect(
      tree.root.findByProps({ testID: 'lesson-technique-introduction' }),
    ).toBeTruthy();
    expect(
      tree.root.findByProps({ testID: 'lesson-open-explanation' }).props
        .disabled,
    ).toBe(true);
    expect(
      tree.root.findByProps({ testID: 'lesson-practice-unavailable' }),
    ).toBeTruthy();
    expect(await progress.listReadings()).toHaveLength(0);
    await press('lesson-back');
    expect(tree.root.findByProps({ testID: 'lesson-directory' })).toBeTruthy();
  },
);

test('dark technique cards remain distinct from the page background', async () => {
  await render('de', openBundledLessonRepository());
  for (const level of [1, 2, 3]) {
    const style = StyleSheet.flatten(
      tree.root.findByProps({ testID: `lesson-level-${level}-card` }).props
        .style,
    );
    expect(style.backgroundColor).toBe(darkPalette.panelSurface);
    expect(style.borderColor).toBe(darkPalette.panelBorder);
  }
  await press('lesson-technique-nakedPair');
  await press('lesson-open-article');
  for (const id of ['lesson-diagram-card', 'lesson-reading-card']) {
    const style = StyleSheet.flatten(
      tree.root.findByProps({ testID: id }).props.style,
    );
    expect(style.backgroundColor).toBe(darkPalette.panelSurface);
    expect(style.borderColor).toBe(darkPalette.panelBorder);
  }
  expect(darkPalette.panelSurface).not.toBe(darkPalette.background);
  expect(darkPalette.panelBorder).not.toBe(darkPalette.panelSurface);
});

test.each(LESSON_LOCALES)(
  'opens all 14 technique readings and returns to their hubs in %s',
  async locale => {
    await render(locale, openBundledLessonRepository());
    expect(ARTICLE_TECHNIQUES).toEqual(
      TECHNIQUES.filter(item => item.level <= 3).map(item => item.code),
    );
    for (const technique of ARTICLE_TECHNIQUES) {
      await press(`lesson-technique-${technique}`);
      expect(
        tree.root.findByProps({ testID: 'lesson-open-article' }),
      ).toBeTruthy();
      await press('lesson-open-article');
      expect(tree.root.findByProps({ testID: 'lesson-article' })).toBeTruthy();
      expect(contains(ARTICLE_LABELS[locale].pattern)).toBe(true);
      expect(contains(ARTICLE_LABELS[locale].mistake)).toBe(true);
      expect(contains(TECHNIQUE_ARTICLE_COPY[locale][technique].result)).toBe(
        true,
      );
      const variants = ARTICLE_PATTERN_VARIANTS[technique];
      for (const pattern of variants) {
        const caption =
          pattern === variants[0]
            ? TECHNIQUE_ARTICLE_COPY[locale][technique].diagram
            : ARTICLE_ALTERNATE_DIAGRAMS[locale][technique][pattern];
        expect(caption).toBeTruthy();
        if (variants.length > 1) {
          await press(`lesson-pattern-${pattern}`);
          expect(
            tree.root.findByProps({ testID: `lesson-pattern-${pattern}` }).props
              .accessibilityState.selected,
          ).toBe(true);
          expect(contains(ARTICLE_PATTERN_LABELS[locale][pattern])).toBe(true);
        } else {
          expect(
            tree.root.findAllByProps({ testID: `lesson-pattern-${pattern}` }),
          ).toHaveLength(0);
        }
        expect(contains(caption!)).toBe(true);
        expect(tree.root.findByType(TechniquePatternDiagram).props).toEqual(
          expect.objectContaining({
            pattern,
            accessibilityLabel: caption,
          }),
        );
      }
      for (const pattern of ['row', 'column', 'box', 'cell']) {
        expect(
          tree.root.findAllByProps({ testID: `lesson-pattern-${pattern}` })
            .length > 0,
        ).toBe(variants.length > 1 && new Set<string>(variants).has(pattern));
      }
      await press('lesson-back');
      expect(tree.root.findByProps({ testID: 'lesson-hub' })).toBeTruthy();
      await press('lesson-open-article');
      expect(tree.root.findByType(TechniquePatternDiagram).props.pattern).toBe(
        variants[0],
      );
      await press('lesson-back');
      await press('lesson-back');
    }
    expect(tree.root.findByProps({ testID: 'lesson-directory' })).toBeTruthy();
    expect(await progress.listReadings()).toHaveLength(0);
  },
);

test.each(LESSON_LOCALES)(
  'complete free reading flow has localized controls in %s',
  async locale => {
    await render(locale);
    const copy = LESSON_COPY[locale];
    await press('lesson-technique-hiddenSingle');
    expect(tree.root.findByProps({ testID: 'lesson-hub' })).toBeTruthy();
    expect(await progress.listReadings()).toHaveLength(0);
    await press('lesson-open-explanation');
    expect(
      tree.root.findAllByProps({ testID: 'lesson-intro' }).length,
    ).toBeGreaterThan(0);
    expect(contains(copy.prerequisites)).toBe(true);
    assertButtonContrast(
      tree.root.findByProps({ testID: 'lesson-start-proof' }),
      copy.start,
    );
    expect(
      tree.root.findAllByProps({ testID: 'lesson-complete' }),
    ).toHaveLength(0);
    await press('lesson-start-proof');
    const player = tree.root.findByType(HintWalkthroughPlayer);
    expect(
      tree.root
        .findAllByType(Text)
        .filter(
          node =>
            node.props.children === content.getLesson(SINGLE, locale)!.title,
        ),
    ).toHaveLength(1);
    const nextButton = tree.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node =>
        node
          .findAllByType(Text)
          .some(child => child.props.children === copy.next),
      )!;
    assertButtonContrast(nextButton, copy.next);
    expect(player.props.labels.next).toBe(copy.next);
    expect(player.props.snapshot).toBe(
      content.getLesson(SINGLE, locale)!.example,
    );
    expect(
      tree.root.findAllByProps({ testID: 'lesson-show-recap' }),
    ).toHaveLength(0);
    await finishProof();
    expect(contains(copy.mistakes)).toBe(true);
    expect((await progress.listReadings())[0].completedAt).toBeNull();
    await press('lesson-complete');
    expect(controller.snapshot.lesson).toBeNull();
    expect(tree.root.findByProps({ testID: 'lesson-hub' })).toBeTruthy();
    expect(
      controller.snapshot.lessons.find(item => item.id === SINGLE)
        ?.readingState,
    ).toBe('completed');
    await press('lesson-open-explanation');
    expect(controller.snapshot.reading!.location.chapter).toBe('intro');
    expect(controller.snapshot.reading!.completedAt).not.toBeNull();
  },
);

test('directory exit, unmount and hardware Back preserve the accepted proof position', async () => {
  let hardwareBack!: Parameters<typeof BackHandler.addEventListener>[1];
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, listener) => {
      hardwareBack = listener;
      return { remove: jest.fn() };
    });
  await render();
  await press('lesson-technique-hiddenSingle');
  await press('lesson-open-explanation');
  await press('lesson-start-proof');
  await act(async () => {
    await controller.setPage(1);
  });
  const location = controller.snapshot.reading!.location;
  act(() => {
    expect(hardwareBack({ type: 'hardwareBackPress', timeStamp: 1 })).toBe(
      true,
    );
  });
  expect(onClose).not.toHaveBeenCalled();
  expect(
    tree.root.findAllByProps({ testID: 'lesson-hub' }).length,
  ).toBeGreaterThan(0);
  await press('lesson-back');
  expect(tree.root.findByProps({ testID: 'lesson-directory' })).toBeTruthy();
  await press('lesson-back');
  expect(onClose).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
  await render('ja');
  await press('lesson-technique-hiddenSingle');
  await press('lesson-open-explanation');
  expect(controller.snapshot.reading!.location).toEqual(location);
  expect(tree.root.findByType(HintWalkthroughPlayer).props.pageIndex).toBe(1);
});

test('failed recap completion stays on recap and exposes retry without marking read', async () => {
  await render();
  await press('lesson-technique-hiddenSingle');
  await press('lesson-open-explanation');
  await press('lesson-start-proof');
  await finishProof();
  jest.spyOn(progress, 'saveLocation').mockRejectedValueOnce(new Error('disk'));
  await press('lesson-complete');
  expect(
    tree.root.findAllByProps({ testID: 'lesson-recap' }).length,
  ).toBeGreaterThan(0);
  expect(contains(LESSON_COPY.en.saveError)).toBe(true);
  expect((await progress.listReadings())[0].completedAt).toBeNull();
  await press('lesson-retry');
  expect(
    controller.snapshot.lessons.find(item => item.id === SINGLE)?.readingState,
  ).toBe('completed');
});

test('empty catalog and failed load display distinct states, and retry loads the directory', async () => {
  jest.spyOn(progress, 'listReadings').mockRejectedValueOnce(new Error('disk'));
  await render('en', openBundledLessonRepository());
  expect(contains(LESSON_COPY.en.loadError)).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'lesson-directory' })).toHaveLength(
    0,
  );
  await press('lesson-retry');
  expect(tree.root.findByProps({ testID: 'lesson-directory' })).toBeTruthy();
  await press('lesson-technique-fullHouse');
  expect(
    tree.root.findByProps({ testID: 'lesson-open-explanation' }).props.disabled,
  ).toBe(true);
  expect(
    tree.root.findByProps({ testID: 'lesson-practice-unavailable' }),
  ).toBeTruthy();
});

test('all fish targets are selectable and switching target restarts the persisted proof', async () => {
  await render();
  await act(async () => {
    await controller.openLesson('preview-jellyfish');
  });
  await press('lesson-start-proof');
  await act(async () => {
    await controller.setPage(1);
  });
  const targets = controller.snapshot.lesson!.example.step.eliminations;
  const target = targets.at(-1)!;
  for (const option of targets)
    expect(
      tree.root.findAllByProps({
        testID: `lesson-target-${option.cell}-${option.digit}`,
      }).length,
    ).toBeGreaterThan(0);
  await press(`lesson-target-${target.cell}-${target.digit}`);
  expect(controller.snapshot.reading!.location.target).toEqual(target);
  expect(tree.root.findByType(HintWalkthroughPlayer).props.pageIndex).toBe(0);
});
