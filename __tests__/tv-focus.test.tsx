import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { TVPressable } from '../src/ui/components/FocusablePressable';

test('remote focus is visible without changing activation or layout', async () => {
  const onPress = jest.fn();
  const onFocus = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <TVPressable onPress={onPress} onFocus={onFocus} style={{ width: 120 }}>
        <Text>Continue</Text>
      </TVPressable>,
    );
  });
  const button = () =>
    renderer.root.find(
      node =>
        typeof node.type === 'string' &&
        typeof node.props.onFocus === 'function',
    );
  expect(button().props.focusable).toBe(true);
  await ReactTestRenderer.act(() => button().props.onFocus({}));
  const style = StyleSheet.flatten(button().props.style);
  expect(style).toMatchObject({ width: 120, outlineWidth: 3 });
  expect(onFocus).toHaveBeenCalledTimes(1);
  expect(onPress).not.toHaveBeenCalled();
  await ReactTestRenderer.act(() =>
    button().props.onClick({ nativeEvent: {} }),
  );
  expect(onPress).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(() => button().props.onBlur({}));
  expect(StyleSheet.flatten(button().props.style).outlineWidth).toBeUndefined();
  await ReactTestRenderer.act(() => {
    renderer.update(<TVPressable disabled onPress={onPress} />);
  });
  expect(button().props.focusable).toBe(false);
  await ReactTestRenderer.act(() => renderer.unmount());
});
