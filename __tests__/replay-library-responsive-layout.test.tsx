import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { SessionReplaySource } from '../src/application/game/session-replay-source';
import { LocalizationProvider } from '../src/localization';
import { ReplayLibraryScreen } from '../src/ui/screens/SessionReplayScreen';
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

function renderLibrary(source: SessionReplaySource, onOpen = jest.fn()) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="zh-Hans">
      <ThemeProvider preference="light">
        <ReplayLibraryScreen source={source} onOpen={onOpen} />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

function sourceFixture() {
  const { session } = teachingFixture();
  const source: SessionReplaySource = {
    listReplaySessions: jest.fn(async () => [
      {
        sessionId: session.state.sessionId,
        difficultyLevel: session.state.difficultyLevel,
        elapsedMs: session.state.timer.elapsedMs,
        hintUseCount: session.state.hintUseCount,
        recoverability: 'action_history' as const,
        status: session.state.status,
        updatedAtEpochMs: session.state.updatedAtEpochMs,
      },
    ]),
    readReplaySession: jest.fn(async () => session),
  };
  return { session, source };
}

describe('Replay library responsive layout', () => {
  afterEach(() => {
    mockLandscapeTabletLayout = false;
  });

  test('keeps the phone list unchanged and does not preload a board', async () => {
    const { source } = sourceFixture();
    const onOpen = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = renderLibrary(source, onOpen);
    });

    expect(
      renderer.root.findByProps({ testID: 'replay-library-portrait-layout' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({ testID: 'replay-library-preview' }),
    ).toHaveLength(0);
    expect(source.readReplaySession).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'replay-session-s' }).props.onPress(),
    );
    expect(onOpen).toHaveBeenCalledWith('s');
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('shows the selected initial board in an unframed tablet preview', async () => {
    mockLandscapeTabletLayout = true;
    const { session, source } = sourceFixture();
    const onOpen = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = renderLibrary(source, onOpen);
    });

    expect(source.readReplaySession).toHaveBeenCalledWith('s');
    expect(
      renderer.root.findByProps({ testID: 'replay-library-landscape-layout' }),
    ).toBeTruthy();
    const preview = renderer.root.findByProps({
      testID: 'replay-library-preview',
    });
    expect(StyleSheet.flatten(preview.props.style)).toMatchObject({
      alignItems: 'flex-start',
      borderLeftWidth: 1,
    });
    expect(StyleSheet.flatten(preview.props.style)).not.toHaveProperty(
      'backgroundColor',
    );
    expect(StyleSheet.flatten(preview.props.style)).not.toHaveProperty(
      'borderRadius',
    );

    const board = renderer.root.find(
      node =>
        node.props.disabled === true &&
        node.props.showCandidates === false &&
        node.props.state?.givens,
    );
    expect(board.props.showSelection).toBe(false);
    expect(board.props.state.values).toEqual(session.state.givens);
    expect(board.props.state.values).not.toEqual(session.state.values);

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'replay-library-open-selected' })
        .props.onPress(),
    );
    expect(onOpen).toHaveBeenCalledWith('s');
    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
