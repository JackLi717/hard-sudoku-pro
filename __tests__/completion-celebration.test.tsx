import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { CompletionCelebration } from '../src/ui/components/CompletionCelebration';
import { ScreenStateProvider } from '../src/ui/screen-state';
import { ThemeProvider } from '../src/ui/theme';

const mockUseReducedMotionPreference = jest.fn();

jest.mock('../src/ui/use-reduced-motion', () => ({
  useReducedMotionPreference: () => mockUseReducedMotionPreference(),
}));

function CelebrationScene({
  onAction = jest.fn(),
  sessionId = 'session-1',
  visible = true,
}: {
  onAction?(): void;
  sessionId?: string;
  visible?: boolean;
}): React.JSX.Element {
  return (
    <ThemeProvider preference="light">
      <ScreenStateProvider>
        {visible ? (
          <>
            <CompletionCelebration sessionId={sessionId} />
            <Pressable onPress={onAction} testID="completion-action">
              <Text>Continue</Text>
            </Pressable>
          </>
        ) : null}
      </ScreenStateProvider>
    </ThemeProvider>
  );
}

describe('CompletionCelebration', () => {
  const animation = {
    reset: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  beforeEach(() => {
    mockUseReducedMotionPreference.mockReturnValue({
      ready: true,
      reduceMotion: false,
    });
    jest.spyOn(Animated, 'parallel').mockReturnValue(animation);
    jest.spyOn(Animated, 'timing');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('plays a short decorative entrance without blocking completion actions', async () => {
    const onAction = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <CelebrationScene onAction={onAction} />,
      );
    });

    expect(Animated.timing).toHaveBeenCalledTimes(2);
    expect(Animated.timing).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ duration: 520, useNativeDriver: true }),
    );
    expect(Animated.timing).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        delay: 120,
        duration: 780,
        useNativeDriver: true,
      }),
    );
    expect(Animated.parallel).toHaveBeenCalledTimes(1);
    expect(animation.start).toHaveBeenCalledTimes(1);
    expect(
      new Set(
        renderer.root
          .findAll(
            node =>
              typeof node.props.testID === 'string' &&
              node.props.testID.startsWith('completion-celebration-spark-'),
          )
          .map(node => node.props.testID),
      ).size,
    ).toBe(6);

    const decoration = renderer.root.findByProps({
      testID: 'completion-celebration',
    });
    expect(decoration.props.accessibilityElementsHidden).toBe(true);
    expect(decoration.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
    expect(decoration.props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(decoration.props.style)).toMatchObject({
      height: 102,
      width: 104,
    });

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'completion-action' })
        .props.onPress();
    });
    expect(onAction).toHaveBeenCalledTimes(1);

    await act(async () => renderer.unmount());
  });

  test('does not replay the full entrance after returning to the same session', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<CelebrationScene />);
    });

    await act(async () => {
      renderer.update(<CelebrationScene visible={false} />);
    });
    await act(async () => {
      renderer.update(<CelebrationScene />);
    });

    expect(Animated.parallel).toHaveBeenCalledTimes(1);
    expect(animation.start).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findByProps({ testID: 'result-victory-medal' }),
    ).toBeTruthy();

    await act(async () => renderer.unmount());
  });

  test('uses the static completed state when reduced motion is enabled', async () => {
    mockUseReducedMotionPreference.mockReturnValue({
      ready: true,
      reduceMotion: true,
    });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<CelebrationScene />);
    });

    expect(Animated.timing).not.toHaveBeenCalled();
    expect(Animated.parallel).not.toHaveBeenCalled();
    expect(
      renderer.root.findByProps({ testID: 'result-victory-medal' }),
    ).toBeTruthy();

    await act(async () => {
      renderer.update(<CelebrationScene visible={false} />);
    });
    mockUseReducedMotionPreference.mockReturnValue({
      ready: true,
      reduceMotion: false,
    });
    await act(async () => {
      renderer.update(<CelebrationScene />);
    });
    expect(Animated.parallel).not.toHaveBeenCalled();

    await act(async () => renderer.unmount());
  });
});
