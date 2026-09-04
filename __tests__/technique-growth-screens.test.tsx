import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { GrowthScreens } from '../src/ui/technique-growth/GrowthScreens';
import { buildGrowthViewModel } from '../src/application/technique-growth/view-model';
import { TechniqueGrowthController } from '../src/application/technique-growth/controller';
import { LocalizationProvider } from '../src/localization';
import { ThemeProvider } from '../src/ui/theme';
import { SessionReplayScreen } from '../src/ui/screens/SessionReplayScreen';
import { teachingFixture } from './helpers/replay';
const wrap = (child: React.ReactNode) => (
  <LocalizationProvider locale="zh-Hans">
    <ThemeProvider preference="light">{child}</ThemeProvider>
  </LocalizationProvider>
);
const text = (r: Renderer.ReactTestRenderer) =>
  r.root
    .findAllByType(Text)
    .map(n => n.props.children)
    .flat(Infinity)
    .join(' ');
function click(r: Renderer.ReactTestRenderer, label: string) {
  const button = r.root
    .findAll(
      n =>
        n.props.accessibilityRole === 'button' &&
        typeof n.props.onPress === 'function',
    )
    .find(
      n =>
        n.props.accessibilityLabel === label ||
        n
          .findAllByType(Text)
          .some(t =>
            [t.props.children].flat(Infinity).join('').includes(label),
          ),
    );
  if (!button) throw Error(`No button ${label}`);
  button.props.onPress();
}
test('empty overview, all 39 techniques, manual follow and local source copy', async () => {
  const controller = {
    follow: jest.fn(async () => undefined),
    retry: jest.fn(),
  } as unknown as TechniqueGrowthController;
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(
      wrap(
        <GrowthScreens
          controller={controller}
          vm={buildGrowthViewModel([])}
          onClose={jest.fn()}
          onStart={jest.fn()}
          onReplay={jest.fn()}
        />,
      ),
    );
  });
  expect(text(r)).toContain('你的技巧足迹会从第一局开始');
  await act(async () => click(r, '全部39项'));
  expect(text(r)).toContain('强制网');
  await act(async () => click(r, 'X翼'));
  expect(text(r)).not.toMatch(/\{regions\}/);
  await act(async () => click(r, '关注'));
  expect(controller.follow).toHaveBeenCalledWith('xWing');
  await act(async () => r.unmount());
});
test('invalid stable deep link does not show an unrelated board without explicit action', async () => {
  const { session } = teachingFixture();
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(
      wrap(
        <SessionReplayScreen
          sessionId="s"
          source={{
            readReplaySession: async () => session,
            listReplaySessions: async () => [],
          }}
          initialReference={{ sessionId: 's', moveIds: ['missing'] }}
          onClose={jest.fn()}
        />,
      ),
    );
  });
  expect(text(r)).toContain('无法定位');
  expect(r.root.findAll(n => n.props.testID === 'sudoku-board')).toHaveLength(
    0,
  );
  await act(async () => r.unmount());
});

test('exiting a walkthrough never completes it; Finish saves once and returns to the original move', async () => {
  jest.useFakeTimers();
  const { session, report } = teachingFixture();
  const completed = jest.fn(async () => undefined);
  let r!: Renderer.ReactTestRenderer;
  const source = {
    readReplaySession: async () => session,
    listReplaySessions: async () => [],
    explainReplayMove: async () => report,
  };
  await act(async () => {
    r = Renderer.create(
      wrap(
        <SessionReplayScreen
          sessionId="s"
          source={source}
          onClose={jest.fn()}
          onWalkthroughComplete={completed}
        />,
      ),
    );
  });
  await act(async () => click(r, '下一步操作'));
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  const open = () =>
    r.root
      .findAll(n => n.props.testID === 'replay-explanation-0')[0]
      .props.onPress();
  await act(async () => open());
  await act(async () => click(r, '退出演练'));
  expect(completed).not.toHaveBeenCalled();
  await act(async () => open());
  await act(async () => click(r, '下一步'));
  await act(async () => click(r, '完成演练'));
  expect(completed).toHaveBeenCalledTimes(1);
  expect(completed.mock.calls[0]).toEqual([
    expect.objectContaining({ sessionId: 's', moveIds: ['m'] }),
    [expect.objectContaining({ technique: 'fullHouse' })],
  ]);
  expect(text(r)).not.toContain('本次演练已记录');
  expect(text(r)).toContain('第 1 / 1 步');
  await act(async () => r.unmount());
  jest.useRealTimers();
});
