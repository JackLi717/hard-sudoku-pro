import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { LocalizationProvider, translate } from '../src/localization';
import { FinishTailAction } from '../src/ui/components/FinishTailAction';
import { ScreenStateProvider } from '../src/ui/screen-state';
import { ThemeProvider } from '../src/ui/theme';

function measureAction(
  renderer: ReactTestRenderer.ReactTestRenderer,
  width = 390,
  buttonWidth = 72,
) {
  renderer.root
    .findByProps({ testID: 'auto-complete-action-row' })
    .props.onLayout({
      nativeEvent: { layout: { width, height: 31 } },
    });
  renderer.root.findByProps({ testID: 'auto-complete-action' }).props.onLayout({
    nativeEvent: { layout: { width: buttonWidth, height: 31 } },
  });
}

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  'announces finish once in %s, keeps the button, and never starts without a tap',
  async locale => {
    jest.useFakeTimers();
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const onFinish = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const render = (
      visible: boolean,
      running = false,
      count = 18,
      mounted = true,
      sessionId = 'tail',
    ) => (
      <ScreenStateProvider>
        <LocalizationProvider locale={locale}>
          <ThemeProvider preference="light">
            {mounted ? (
              <FinishTailAction
                key={sessionId}
                sessionId={sessionId}
                boardHeight={390}
                count={count}
                visible={visible}
                running={running}
                reduceMotion
                onFinish={onFinish}
              />
            ) : null}
          </ThemeProvider>
        </LocalizationProvider>
      </ScreenStateProvider>
    );
    const action = () =>
      renderer.root.findByProps({ testID: 'auto-complete-action' });
    const prompts = () =>
      renderer.root.findAll(
        node => node.props.testID === 'auto-complete-ready-prompt',
        { deep: false },
      );
    try {
      await act(async () => {
        renderer = ReactTestRenderer.create(render(false));
      });
      expect(announce).not.toHaveBeenCalled();
      await act(async () => renderer.update(render(true)));
      await act(async () => measureAction(renderer));
      expect(prompts()).toHaveLength(1);
      expect(announce).toHaveBeenCalledWith(
        translate(locale, 'game.autoCompleteReady', { count: 18 }),
      );
      expect(action().props.accessibilityRole).toBe('button');
      expect(action().props.accessibilityLabel).toBe(
        translate(locale, 'game.autoComplete'),
      );
      expect(onFinish).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(4000));
      expect(prompts()).toHaveLength(0);
      expect(action().props.disabled).toBe(false);
      await act(async () => renderer.update(render(true, false, 17)));
      expect(prompts()).toHaveLength(0);
      await act(async () => renderer.update(render(false)));
      expect(
        renderer.root.findAllByProps({ testID: 'auto-complete-action' }),
      ).toHaveLength(0);
      await act(async () => renderer.update(render(true)));
      await act(async () => measureAction(renderer));
      expect(prompts()).toHaveLength(0);
      await act(async () => renderer.update(render(false, false, 18, false)));
      await act(async () => renderer.update(render(true)));
      await act(async () => measureAction(renderer));
      expect(prompts()).toHaveLength(0);
      expect(announce).toHaveBeenCalledTimes(1);
      expect(onFinish).not.toHaveBeenCalled();
      await act(async () => {
        action().props.onPress();
        action().props.onPress();
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(action().props.disabled).toBe(true);
      await act(async () => renderer.update(render(true, true)));
      expect(action().props.accessibilityState.busy).toBe(true);
      expect(prompts()).toHaveLength(0);
      await act(async () =>
        renderer.update(render(true, false, 18, true, 'next-tail')),
      );
      await act(async () => measureAction(renderer));
      expect(announce).toHaveBeenCalledTimes(2);
      expect(prompts()).toHaveLength(1);
    } finally {
      await act(async () => renderer?.unmount());
      announce.mockRestore();
      jest.useRealTimers();
    }
  },
);

test('waits for the fitted foreground layout before inviting the player', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const render = (announceAllowed: boolean, boardHeight = 390) => (
    <LocalizationProvider locale="zh-Hans">
      <ThemeProvider preference="dark">
        <FinishTailAction
          sessionId="measuring"
          boardHeight={boardHeight}
          count={40}
          visible
          running={false}
          reduceMotion
          announceAllowed={announceAllowed}
          onFinish={jest.fn()}
        />
      </ThemeProvider>
    </LocalizationProvider>
  );
  try {
    await act(async () => {
      renderer = ReactTestRenderer.create(render(false));
    });
    await act(async () => measureAction(renderer));
    expect(announce).not.toHaveBeenCalled();
    expect(
      renderer.root.findAllByProps({ testID: 'auto-complete-ready-prompt' }),
    ).toHaveLength(0);
    await act(async () => renderer.update(render(true, 0)));
    expect(announce).not.toHaveBeenCalled();
    await act(async () => renderer.update(render(true)));
    expect(announce).toHaveBeenCalledWith('余下 40 格可自动填完');
  } finally {
    await act(async () => renderer?.unmount());
    announce.mockRestore();
  }
});

test.each(['hide', 'unmount', 'layout'] as const)(
  'replays the full invitation when interrupted by %s, without replaying a completed one',
  async interruption => {
    jest.useFakeTimers();
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const finish = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const render = (interrupted = false, count = 18) => (
      <ScreenStateProvider>
        <LocalizationProvider locale="zh-Hans">
          <ThemeProvider preference="light">
            {!(interrupted && interruption === 'unmount') ? (
              <FinishTailAction
                sessionId="interruptible"
                boardHeight={390}
                count={count}
                visible={!(interrupted && interruption === 'hide')}
                announceAllowed={!(interrupted && interruption === 'layout')}
                running={false}
                reduceMotion
                onFinish={finish}
              />
            ) : null}
          </ThemeProvider>
        </LocalizationProvider>
      </ScreenStateProvider>
    );
    const prompt = () =>
      renderer.root.findAll(
        node => node.props.testID === 'auto-complete-ready-prompt',
        { deep: false },
      );
    try {
      await act(async () => {
        renderer = ReactTestRenderer.create(render());
      });
      await act(async () => measureAction(renderer));
      expect(prompt()).toHaveLength(1);
      await act(async () => jest.advanceTimersByTime(1000));
      await act(async () => renderer.update(render(true)));
      expect(prompt()).toHaveLength(0);
      await act(async () => jest.advanceTimersByTime(5000));
      await act(async () => renderer.update(render()));
      await act(async () => measureAction(renderer));
      expect(prompt()).toHaveLength(1);
      expect(announce).toHaveBeenCalledTimes(2);
      await act(async () => jest.advanceTimersByTime(1200));
      await act(async () => renderer.update(render(false, 17)));
      expect(announce).toHaveBeenCalledTimes(2);
      await act(async () => jest.advanceTimersByTime(900));
      expect(prompt()).toHaveLength(0);
      await act(async () => renderer.update(render(true)));
      await act(async () => renderer.update(render()));
      await act(async () => measureAction(renderer));
      expect(prompt()).toHaveLength(0);
      expect(announce).toHaveBeenCalledTimes(2);
      expect(finish).not.toHaveBeenCalled();
    } finally {
      await act(async () => renderer?.unmount());
      announce.mockRestore();
      jest.useRealTimers();
    }
  },
);

test('centers the invitation over the board, fades it out and highlights the button before marking it read', async () => {
  jest.useFakeTimers();
  const timing = jest
    .spyOn(Animated, 'timing')
    .mockImplementation((value, config) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let completion: ((result: { finished: boolean }) => void) | undefined;
      return {
        start: callback => {
          completion = callback;
          timer = setTimeout(() => {
            (value as Animated.Value).setValue(config.toValue as number);
            completion?.({ finished: true });
          }, config.duration ?? 0);
        },
        stop: () => {
          clearTimeout(timer);
          completion?.({ finished: false });
        },
        reset: () => {
          clearTimeout(timer);
        },
      };
    });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const render = (visible = true) => (
    <LocalizationProvider locale="zh-Hans">
      <ThemeProvider preference="dark">
        <FinishTailAction
          sessionId="motion"
          boardHeight={390}
          count={18}
          visible={visible}
          running={false}
          reduceMotion={false}
          onFinish={jest.fn()}
        />
      </ThemeProvider>
    </LocalizationProvider>
  );
  const prompt = () =>
    renderer.root.findByProps({ testID: 'auto-complete-ready-prompt' });
  try {
    await act(async () => {
      renderer = ReactTestRenderer.create(render());
    });
    await act(async () => measureAction(renderer, 390, 72));
    const face = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'auto-complete-button-face' }).props
        .style,
    );
    const target = StyleSheet.flatten(
      renderer.root
        .findByProps({ testID: 'auto-complete-action' })
        .props.style({ pressed: false }),
    );
    expect(face.height).toBe(24);
    expect(target.height).toBe(31);
    const faceTop =
      target.paddingTop + (target.height - target.paddingTop - face.height) / 2;
    expect(faceTop - 3).toBe(2);
    expect(target.height - faceTop - face.height).toBe(2);
    expect(
      renderer.root.findByProps({ testID: 'auto-complete-action' }).props
        .hitSlop,
    ).toMatchObject({ top: 0, bottom: 0 });
    const overlay = renderer.root.findByProps({
      testID: 'auto-complete-ready-overlay',
    });
    expect(overlay.props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(overlay.props.style)).toMatchObject({
      height: 390,
      bottom: 31,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
    });
    const promptStyle = StyleSheet.flatten(prompt().props.style);
    expect(promptStyle.width).toBe(340);
    expect(promptStyle.transform).toBeUndefined();
    await act(async () => jest.advanceTimersByTime(2180));
    expect(promptStyle.opacity.__getValue()).toBe(1);
    await act(async () => jest.advanceTimersByTime(350));
    expect(promptStyle.opacity.__getValue()).toBe(0);
    await act(async () => jest.advanceTimersByTime(140));
    const glow = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'auto-complete-button-glow' }).props
        .style,
    ).opacity;
    expect(glow.__getValue()).toBe(0.22);
    await act(async () => jest.advanceTimersByTime(220));
    expect(
      renderer.root.findAllByProps({ testID: 'auto-complete-ready-prompt' }),
    ).toHaveLength(0);
    await act(async () => renderer.update(render(false)));
    await act(async () => renderer.update(render(true)));
    expect(
      renderer.root.findAllByProps({ testID: 'auto-complete-ready-prompt' }),
    ).toHaveLength(0);
  } finally {
    await act(async () => renderer?.unmount());
    timing.mockRestore();
    jest.useRealTimers();
  }
});
