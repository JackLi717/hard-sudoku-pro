import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Dimensions, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import {
  useAdaptiveLayout,
  useContainerLayout,
} from '../src/ui/layout/adaptive-layout';

function Probe() {
  const container = useContainerLayout();
  const layout = useAdaptiveLayout(container);
  return (
    <View
      testID="probe"
      onLayout={container.onLayout}
      accessibilityLabel={`${container.width},${container.height},${layout.useLandscapeTabletLayout}`}
    />
  );
}

test('accounts for safe areas and parent resizing, and discards measurements after rotation', async () => {
  const previous = {
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  };
  let tree!: Renderer.ReactTestRenderer;
  const rotate = (width: number, height: number) =>
    Dimensions.set({
      window: { width, height, scale: 2, fontScale: 1 },
      screen: { width, height, scale: 2, fontScale: 1 },
    });
  try {
    await act(async () => {
      rotate(960, 600);
      tree = Renderer.create(
        <SafeAreaInsetsContext.Provider
          value={{ top: 24, bottom: 32, left: 20, right: 20 }}
        >
          <Probe />
        </SafeAreaInsetsContext.Provider>,
      );
    });
    const probe = () => tree.root.findByProps({ testID: 'probe' });
    expect(probe().props.accessibilityLabel).toBe('920,544,true');
    act(() =>
      probe().props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 700, height: 544 } },
      }),
    );
    expect(probe().props.accessibilityLabel).toBe('700,544,false');
    act(() =>
      probe().props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 880, height: 544 } },
      }),
    );
    expect(probe().props.accessibilityLabel).toBe('880,544,true');
    await act(async () => rotate(600, 960));
    expect(probe().props.accessibilityLabel).toBe('560,904,false');
  } finally {
    await act(async () => {
      tree?.unmount();
      Dimensions.set(previous);
    });
  }
});
