import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import {
  Animated,
  AppState,
  BackHandler,
  PanResponder,
  StyleSheet,
} from 'react-native';
import { GameToolButton } from '../src/ui/components/GameToolButton';
import { LocalizationProvider } from '../src/localization';
import {
  BASIC_COURSES,
  BASIC_LESSON_COPY,
  type BasicCourse,
} from '../src/localization/basic-lesson-copy';
import {
  LESSON_LOCALES,
  type LessonLocale,
} from '../src/domain/lessons/contracts';
import { BasicLessonBoard } from '../src/ui/components/BasicLessonBoard';
import {
  BasicLessonScreen,
  basicSwipeDirection,
} from '../src/ui/screens/BasicLessonScreen';
import { HelpScreen } from '../src/ui/screens/ProductInfoScreens';
import { ThemeProvider } from '../src/ui/theme';
import { basicScene } from '../src/data/lessons/basic-lessons';
import catalog from '../src/data/lessons/generated/basic-lessons.json';

let mockReduceMotion = true;
jest.mock('../src/ui/components/BasicLessonBoard', () => ({
  BasicLessonBoard: jest.fn(() => null),
}));
jest.mock('../src/ui/use-reduced-motion', () => ({
  useReducedMotionPreference: () => ({
    ready: true,
    reduceMotion: mockReduceMotion,
  }),
}));

let tree: Renderer.ReactTestRenderer;
const onClose = jest.fn();
const onComplete = jest.fn();
async function render(
  course: BasicCourse = 'how-to-play',
  locale: LessonLocale = 'zh-Hans',
  help = false,
) {
  await act(async () => {
    tree = Renderer.create(
      <LocalizationProvider locale={locale}>
        <ThemeProvider preference="light">
          {help ? (
            <HelpScreen onBack={onClose} onComplete={onComplete} />
          ) : (
            <BasicLessonScreen
              course={course}
              onClose={onClose}
              onComplete={onComplete}
            />
          )}
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
}
async function press(id: string) {
  await act(async () => tree.root.findByProps({ testID: id }).props.onPress());
}
function scene() {
  return jest.mocked(BasicLessonBoard).mock.calls.at(-1)![0].scene;
}
function page() {
  return tree.root
    .findByProps({ testID: 'basic-page-count' })
    .props.children.join('');
}
beforeEach(() => {
  mockReduceMotion = true;
  jest.clearAllMocks();
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test.each(LESSON_LOCALES)(
  'all three courses are readable and complete in %s',
  async locale => {
    for (const course of BASIC_COURSES) {
      await render(course, locale);
      const copy = BASIC_LESSON_COPY[locale];
      expect(JSON.stringify(tree.toJSON())).toContain(copy.titles[course]);
      const count = course === 'how-to-play' ? 4 : 5;
      for (let i = 0; i < count; i++) {
        expect(page()).toBe(`${i + 1}/${count}`);
        expect(JSON.stringify(tree.toJSON())).not.toMatch(
          /\{(?:digit|a|b|remaining)\}/,
        );
        await press('basic-next');
      }
      expect(onComplete).toHaveBeenCalledTimes(
        BASIC_COURSES.indexOf(course) + 1,
      );
      await act(async () => tree.unmount());
    }
  },
);

test('settings help opens the new course directly, with separate exit and completion', async () => {
  await render('how-to-play', 'zh-Hans', true);
  expect(page()).toBe('1/4');
  expect(JSON.stringify(tree.toJSON())).not.toContain('开始互动教学');
  await press('basic-close');
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onComplete).not.toHaveBeenCalled();
});

test('swipes from the content, buttons and hardware back share the same bounded page state', async () => {
  const pan = jest.spyOn(PanResponder, 'create');
  const back = jest.spyOn(BackHandler, 'addEventListener');
  await render('next-cell');
  const gesture = (dx: number, dy = 0) =>
    ({ dx, dy } as Parameters<
      NonNullable<
        Parameters<typeof PanResponder.create>[0]['onPanResponderRelease']
      >
    >[1]);
  const config = pan.mock.calls.at(-1)![0];
  const event = {} as Parameters<
    NonNullable<typeof config.onPanResponderRelease>
  >[0];
  expect(
    config.onMoveShouldSetPanResponderCapture!(event, gesture(80, 5)),
  ).toBe(true);
  expect(
    config.onMoveShouldSetPanResponderCapture!(event, gesture(5, 80)),
  ).toBe(false);
  await act(async () => {
    config.onPanResponderRelease!(event, gesture(90));
  });
  expect(page()).toBe('1/5');
  await act(async () => {
    config.onPanResponderRelease!(event, gesture(-90));
  });
  expect(page()).toBe('2/5');
  await press('basic-next');
  expect(page()).toBe('3/5');
  await act(async () => {
    back.mock.calls.at(-1)![1]({ type: 'hardwareBackPress', timeStamp: 0 });
  });
  expect(page()).toBe('2/5');
  await press('basic-previous');
  expect(page()).toBe('1/5');
  for (let i = 0; i < 7; i++)
    await act(async () => {
      config.onPanResponderRelease!(event, gesture(-90));
    });
  expect(page()).toBe('5/5');
  expect(onComplete).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(basicSwipeDirection(-30, 2)).toBe(0);
  expect(basicSwipeDirection(-80, 120)).toBe(0);
});

test('reduced motion exposes every demo state without timers or required board input', async () => {
  await render();
  expect(scene().regions[0].kind).toBe('row');
  await press('basic-next-frame');
  expect(scene().regions[0].kind).toBe('column');
  await press('basic-next-frame');
  expect(scene().regions[0].kind).toBe('box');
  await press('basic-next-frame');
  expect(scene().regions).toHaveLength(3);
  await press('basic-next');
  expect(scene().values.every(n => n === 0)).toBe(true);
  for (let i = 0; i < 5; i++) await press('basic-next-frame');
  expect(scene().values[catalog.operations.fill]).toBe(6);
  await press('basic-next');
  for (let i = 0; i < 9; i++) await press('basic-next-frame');
  expect(scene().pencil).toBe(true);
  expect(scene().notes[catalog.operations.notes]).toEqual([1, 2, 7]);
  await press('basic-next');
  expect(
    tree.root.findAllByProps({ testID: 'basic-demo-caption' }),
  ).toHaveLength(0);
  await press('basic-next-frame');
  await press('basic-next-frame');
  expect(JSON.stringify(tree.toJSON())).toContain('卡住了？试试提示');
});

test('animation pauses in background, replays and restarts when revisiting a page', async () => {
  jest.useFakeTimers();
  mockReduceMotion = false;
  const appState = jest.spyOn(AppState, 'addEventListener');
  await render();
  await act(async () => jest.advanceTimersByTime(1900));
  expect(scene().regions[0].kind).toBe('column');
  const listener = appState.mock.calls.find(call => call[0] === 'change')![1];
  await act(async () => listener('background'));
  await act(async () => jest.advanceTimersByTime(10000));
  expect(scene().regions[0].kind).toBe('column');
  await act(async () => listener('active'));
  await act(async () => jest.advanceTimersByTime(1900));
  expect(scene().regions[0].kind).toBe('box');
  await press('basic-replay');
  expect(scene().regions[0].kind).toBe('row');
  await press('basic-next');
  await act(async () => jest.advanceTimersByTime(1100));
  expect(scene().values).toEqual(catalog.operations.board);
  await press('basic-previous');
  expect(scene().regions[0].kind).toBe('row');
  await act(async () => tree.unmount());
  const calls = jest.mocked(BasicLessonBoard).mock.calls.length;
  await act(async () => jest.advanceTimersByTime(20000));
  expect(jest.mocked(BasicLessonBoard).mock.calls).toHaveLength(calls);
});

test('static stories retain the actual evidence and never mutate bundled examples', () => {
  const before = JSON.stringify(catalog);
  const c = catalog.certainty;
  expect(basicScene('certainty', 1).notes[c.target]).toEqual(c.candidates);
  expect(basicScene('certainty', 3).struckNotes).toEqual([c.digit]);
  expect(basicScene('certainty', 4).values[c.target]).toBe(c.remaining);
  const s = catalog.scanning;
  expect(basicScene('next-cell', 1).excluded).toEqual(s.first.excluded);
  expect(basicScene('next-cell', 2).excluded).toEqual(s.first.excluded);
  expect(basicScene('next-cell', 3).values[s.second.cell]).toBe(s.digit);
  expect(basicScene('next-cell', 4).excluded).toEqual([]);
  expect(JSON.stringify(catalog)).toBe(before);
});

test('tablet basics fill the container and operation controls follow gameplay order', async () => {
  for (const course of BASIC_COURSES) {
    await render(course);
    await act(async () => {
      tree.root.findByProps({ testID: 'basic-lesson-screen' }).props.onLayout({
        nativeEvent: { layout: { width: 1024, height: 1300 } },
      });
    });
    expect(jest.mocked(BasicLessonBoard).mock.calls.at(-1)![0]).toMatchObject({
      size: 1024,
      gameLayout: course === 'how-to-play',
    });
    if (course === 'how-to-play') {
      await press('basic-next');
      const stage = tree.root.findByProps({ testID: 'basic-demo-stage' });
      const ids = stage
        .findAll(node => typeof node.type === 'string')
        .map(node => node.props.testID);
      expect(ids.indexOf('basic-number-pad')).toBeLessThan(
        ids.indexOf('basic-toolbar'),
      );
      expect(
        tree.root.findAllByType(GameToolButton).map(tool => tool.props.icon),
      ).toEqual(['undo', 'erase', 'sparkle', 'pencil', 'hint', 'bolt']);
    }
    await act(async () => tree.unmount());
  }
});

test('input and key feedback wait for the hand to arrive and finish pressing', async () => {
  jest.useFakeTimers();
  mockReduceMotion = false;
  const animations: {
    toValue: unknown;
    finish: (result: { finished: boolean }) => void;
  }[] = [];
  jest.spyOn(Animated, 'timing').mockImplementation((_, config) => ({
    start: callback => {
      if (callback)
        animations.push({ toValue: config.toValue, finish: callback });
    },
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  const advance = async (ms: number) =>
    act(async () => jest.advanceTimersByTime(ms));
  const fingerDown = async (before: () => void, after: () => void) => {
    before();
    const travel = animations.at(-1)!;
    expect(typeof travel.toValue).toBe('object');
    await act(async () => travel.finish({ finished: true }));
    before(); // Arriving at the key alone must not enter anything.
    const down = animations.at(-1)!;
    expect(down.toValue).toBe(0.85);
    await act(async () => down.finish({ finished: true }));
    after();
  };
  await render();
  await press('basic-next');
  await advance(1100);
  await advance(1100);
  await fingerDown(
    () => expect(scene().selected).toBeNull(),
    () => expect(scene().selected).toBe(catalog.operations.fill),
  );
  await advance(550);
  await advance(1100);
  const keyColor = () =>
    StyleSheet.flatten(
      tree.root.findByProps({ testID: 'basic-digit-6' }).props.style,
    ).backgroundColor;
  await fingerDown(
    () => {
      expect(scene().values[catalog.operations.fill]).toBe(0);
      expect(keyColor()).toBeUndefined();
    },
    () => {
      expect(scene().values[catalog.operations.fill]).toBe(6);
      expect(keyColor()).toBeDefined();
    },
  );
  await press('basic-next');
  await fingerDown(
    () => expect(scene().selected).toBeNull(),
    () => expect(scene().selected).toBe(catalog.operations.notes),
  );
  await advance(550);
  await fingerDown(
    () => expect(scene().pencil).toBe(false),
    () => expect(scene().pencil).toBe(true),
  );
  await advance(550);
  await advance(1100);
  for (const [index, digit] of [1, 2, 7].entries()) {
    await fingerDown(
      () =>
        expect(scene().notes[catalog.operations.notes]).not.toContain(digit),
      () =>
        expect(scene().notes[catalog.operations.notes]).toEqual(
          [1, 2, 7].slice(0, index + 1),
        ),
    );
    if (index < 2) {
      await advance(550);
      await advance(1100);
    }
  }
  await press('basic-next');
  await advance(1100);
  await fingerDown(
    () =>
      expect(
        tree.root.findAllByProps({ testID: 'basic-demo-caption' }),
      ).toHaveLength(0),
    () =>
      expect(
        tree.root.findAllByProps({ testID: 'basic-demo-caption' }).length,
      ).toBeGreaterThan(0),
  );
});
