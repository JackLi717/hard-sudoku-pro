import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AccessibilityInfo, Text } from 'react-native';
import { useReducedMotion } from '../src/ui/use-reduced-motion';

function ReducedMotionProbe({
  animationsEnabled,
}: {
  animationsEnabled: boolean;
}) {
  const reduced = useReducedMotion(animationsEnabled);
  return (
    <Text testID="reduced-motion-state">
      {reduced ? 'reduced' : 'animated'}
    </Text>
  );
}

describe('phase 6 accessibility behavior', () => {
  test('reacts to system reduced-motion changes and the in-app animation switch', async () => {
    let systemListener: ((enabled: boolean) => void) | undefined;
    const remove = jest.fn();
    const initial = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const subscribe = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((event, listener) => {
        if (event === 'reduceMotionChanged') {
          systemListener = listener as (enabled: boolean) => void;
        }
        return { remove } as ReturnType<
          typeof AccessibilityInfo.addEventListener
        >;
      });

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <ReducedMotionProbe animationsEnabled />,
      );
    });
    expect(
      renderer.root.findByProps({ testID: 'reduced-motion-state' }).props
        .children,
    ).toBe('animated');

    await ReactTestRenderer.act(async () => systemListener?.(true));
    expect(
      renderer.root.findByProps({ testID: 'reduced-motion-state' }).props
        .children,
    ).toBe('reduced');

    await ReactTestRenderer.act(async () => {
      renderer.update(<ReducedMotionProbe animationsEnabled={false} />);
    });
    expect(
      renderer.root.findByProps({ testID: 'reduced-motion-state' }).props
        .children,
    ).toBe('reduced');

    ReactTestRenderer.act(() => renderer.unmount());
    expect(remove).toHaveBeenCalledTimes(1);
    initial.mockRestore();
    subscribe.mockRestore();
  });
});
