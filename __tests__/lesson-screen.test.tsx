import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { BackHandler, Text } from 'react-native';
import { LessonController } from '../src/application/lessons/lesson-controller';
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
import { LessonScreen } from '../src/ui/screens/LessonScreen';
import { HintWalkthroughPlayer } from '../src/ui/components/HintWalkthroughPlayer';
import { ThemeProvider } from '../src/ui/theme';
import preview from '../src/debug/generated/lesson-preview.json';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

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
  if (tree) await act(async () => tree.unmount());
  database.close();
  jest.restoreAllMocks();
});

async function render(locale: LessonLocale = 'en', source = content) {
  controller = new LessonController(source, progress, locale);
  await act(async () => {
    tree = Renderer.create(
      <LocalizationProvider locale={locale}>
        <ThemeProvider preference={locale === 'de' ? 'dark' : 'light'}>
          <LessonScreen controller={controller} onClose={onClose} />
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

test.each(LESSON_LOCALES)(
  'complete free reading flow has localized controls in %s',
  async locale => {
    await render(locale);
    const copy = LESSON_COPY[locale];
    expect(contains(copy.free)).toBe(true);
    await press(`lesson-open-${SINGLE}`);
    expect(
      tree.root.findAllByProps({ testID: 'lesson-intro' }).length,
    ).toBeGreaterThan(0);
    expect(contains(copy.prerequisites)).toBe(true);
    expect(
      tree.root.findAllByProps({ testID: 'lesson-complete' }),
    ).toHaveLength(0);
    await press('lesson-start-proof');
    const player = tree.root.findByType(HintWalkthroughPlayer);
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
    expect(contains(copy.completed)).toBe(true);
    expect(controller.snapshot.lesson).toBeNull();
    await press(`lesson-open-${SINGLE}`);
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
  await press(`lesson-open-${SINGLE}`);
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
    tree.root.findAllByProps({ testID: 'lesson-directory' }).length,
  ).toBeGreaterThan(0);
  await press('lesson-back');
  expect(onClose).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
  await render('ja');
  await press('lesson-continue');
  expect(controller.snapshot.reading!.location).toEqual(location);
  expect(tree.root.findByType(HintWalkthroughPlayer).props.pageIndex).toBe(1);
});

test('failed recap completion stays on recap and exposes retry without marking read', async () => {
  await render();
  await press(`lesson-open-${SINGLE}`);
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
  expect(contains(LESSON_COPY.en.completed)).toBe(true);
});

test('empty catalog and failed load display distinct states, and retry loads the directory', async () => {
  jest.spyOn(progress, 'listReadings').mockRejectedValueOnce(new Error('disk'));
  await render('en', openBundledLessonRepository());
  expect(contains(LESSON_COPY.en.loadError)).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'lesson-directory' })).toHaveLength(
    0,
  );
  await press('lesson-retry');
  expect(contains(LESSON_COPY.en.empty)).toBe(true);
});

test('all fish targets are selectable and switching target restarts the persisted proof', async () => {
  await render();
  await press('lesson-open-preview-jellyfish');
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
