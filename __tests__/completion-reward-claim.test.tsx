import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Animated } from 'react-native';
import { LocalizationProvider } from '../src/localization';
import { CompletionRewardClaim } from '../src/ui/components/CompletionRewardClaim';
import { ThemeProvider } from '../src/ui/theme';

const mockUseReducedMotionPreference = jest.fn();

jest.mock('../src/ui/use-reduced-motion', () => ({
  useReducedMotionPreference: () => mockUseReducedMotionPreference(),
}));

function renderClaim(onCollected = jest.fn()) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="en">
      <ThemeProvider preference="light">
        <CompletionRewardClaim
          onCollected={onCollected}
          quickPencil={1}
          smartHint={5}
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('CompletionRewardClaim', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('reveals both icon rewards and animates them away on collect', async () => {
    jest.useFakeTimers();
    mockUseReducedMotionPreference.mockReturnValue({
      ready: true,
      reduceMotion: false,
    });
    const entranceAnimation = {
      reset: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };
    const collectAnimation = {
      reset: jest.fn(),
      start: jest.fn(callback => callback?.({ finished: true })),
      stop: jest.fn(),
    };
    jest.spyOn(Animated, 'spring');
    jest.spyOn(Animated, 'stagger').mockReturnValue(entranceAnimation);
    jest.spyOn(Animated, 'timing').mockReturnValue(collectAnimation);

    const onCollected = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderClaim(onCollected);
    });
    await act(async () => jest.advanceTimersByTime(760));

    expect(Animated.spring).toHaveBeenCalledTimes(2);
    expect(Animated.stagger).toHaveBeenCalledWith(90, expect.any(Array));
    expect(entranceAnimation.start).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Quick Candidates, +1',
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Smart hint, +5' }),
    ).toBeTruthy();

    await act(async () =>
      renderer.root
        .findByProps({ testID: 'completion-reward-collect' })
        .props.onPress(),
    );

    expect(Animated.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 440, useNativeDriver: true }),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'completion-reward-claim' }),
    ).toHaveLength(0);
    expect(onCollected).toHaveBeenCalledTimes(1);

    await act(async () => renderer.unmount());
  });

  test('collects immediately when reduced motion is enabled', async () => {
    mockUseReducedMotionPreference.mockReturnValue({
      ready: true,
      reduceMotion: true,
    });
    jest.spyOn(Animated, 'spring');
    jest.spyOn(Animated, 'stagger');
    jest.spyOn(Animated, 'timing');

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderClaim();
    });
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'completion-reward-collect' })
        .props.onPress(),
    );

    expect(Animated.spring).not.toHaveBeenCalled();
    expect(Animated.stagger).not.toHaveBeenCalled();
    expect(Animated.timing).not.toHaveBeenCalled();
    expect(
      renderer.root.findAllByProps({ testID: 'completion-reward-claim' }),
    ).toHaveLength(0);

    await act(async () => renderer.unmount());
  });
});
