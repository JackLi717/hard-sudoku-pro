import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AppState, StyleSheet, Text } from 'react-native';
import { SessionReplaySource } from '../src/application/game/session-replay-source';
import { LocalizationProvider } from '../src/localization';
import { SessionReplayScreen } from '../src/ui/screens/SessionReplayScreen';
import { ThemeProvider } from '../src/ui/theme';
import { teachingFixture } from './helpers/replay';

let mockLandscapeTabletLayout = false;

jest.mock('../src/ui/layout/adaptive-layout', () => ({
  ...jest.requireActual('../src/ui/layout/adaptive-layout'),
  useAdaptiveLayout: () => ({
    isAndroidTablet: mockLandscapeTabletLayout,
    isLandscape: mockLandscapeTabletLayout,
    useLandscapeTabletLayout: mockLandscapeTabletLayout,
    widthClass: mockLandscapeTabletLayout ? 'expanded' : 'compact',
  }),
}));

function sourceFixture(): SessionReplaySource {
  const { report, session } = teachingFixture();
  return {
    listReplaySessions: jest.fn(async () => []),
    readReplaySession: jest.fn(async () => session),
    analyzeReplayBoard: jest.fn(async () => report),
  };
}

function renderReplay(source: SessionReplaySource) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="zh-Hans">
      <ThemeProvider preference="light">
        <SessionReplayScreen
          onClose={jest.fn()}
          sessionId="s"
          source={source}
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

function textIn(node: ReactTestRenderer.ReactTestInstance): string {
  return node
    .findAllByType(Text)
    .map(text => [text.props.children].flat(Infinity).join(''))
    .join(' ');
}

describe('Session replay responsive layout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (AppState.addEventListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    mockLandscapeTabletLayout = false;
  });

  test.each([
    ['phone', false],
    ['landscape tablet', true],
  ] as const)('uses an unframed playback area on %s', async (_, tablet) => {
    mockLandscapeTabletLayout = tablet;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = renderReplay(sourceFixture());
    });

    const panel = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'replay-panel' }).props.style,
    );
    expect(panel).not.toHaveProperty('backgroundColor');
    expect(panel).not.toHaveProperty('borderRadius');
    expect(panel).not.toHaveProperty('borderWidth');
    if (tablet) {
      expect(panel).toMatchObject({ borderLeftWidth: 1, paddingLeft: 28 });
    } else {
      expect(panel).not.toHaveProperty('borderLeftWidth');
    }

    expect(
      textIn(renderer.root.findByProps({ testID: 'replay-position-summary' })),
    ).toContain('简单 · 第 0 / 1 步');
    expect(
      renderer.root.findAllByProps({ testID: 'replay-step-detail' }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test.each([
    ['phone', false],
    ['landscape tablet', true],
  ] as const)(
    'places the walkthrough legend outside the board on %s',
    async (_, tablet) => {
      mockLandscapeTabletLayout = tablet;
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = renderReplay(sourceFixture());
      });

      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ accessibilityLabel: '下一步操作' })
          .props.onPress(),
      );
      await ReactTestRenderer.act(async () =>
        renderer.root.findByProps({ testID: 'replay-analyze' }).props.onPress(),
      );
      await ReactTestRenderer.act(async () => jest.advanceTimersByTime(350));
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'replay-explanation-0' })
          .props.onPress(),
      );

      const board = renderer.root.find(
        node => node.props.hintVisuals && node.props.disabled === true,
      );
      expect(board.props.showHintLegend).toBe(!tablet);
      expect(
        renderer.root.findAllByProps({
          testID: 'replay-walkthrough-side-legend',
        }).length > 0,
      ).toBe(tablet);

      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );
});
