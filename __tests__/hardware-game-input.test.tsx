import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { HardwareKeyEvent } from '../src/native/NativeProductExperience';
import NativeProductExperience from '../src/native/NativeProductExperience';
import {
  HardwareGameInput,
  gameKeyboardCommand,
  moveKeyboardCell,
} from '../src/ui/hardware-game-input';

jest.mock('../src/native/NativeProductExperience', () => ({
  __esModule: true,
  default: {
    onHardwareKey: jest.fn(),
    setHardwareInputEnabled: jest.fn(),
  },
}));

const key = (value: string, modifiers = {}): HardwareKeyEvent => ({
  key: value,
  control: false,
  meta: false,
  alt: false,
  shift: false,
  ...modifiers,
});

test('maps digits, navigation and game shortcuts without taking system shortcuts', () => {
  expect(gameKeyboardCommand(key('8'))).toEqual({ type: 'digit', digit: 8 });
  expect(gameKeyboardCommand(key('ArrowLeft'))).toEqual({
    type: 'move',
    row: 0,
    column: -1,
  });
  expect(gameKeyboardCommand(key('z', { meta: true }))).toEqual({
    type: 'undo',
  });
  expect(gameKeyboardCommand(key('z', { control: true }))).toEqual({
    type: 'undo',
  });
  expect(gameKeyboardCommand(key('Backspace'))).toEqual({ type: 'erase' });
  expect(gameKeyboardCommand(key('n'))).toEqual({ type: 'pencil' });
  expect(gameKeyboardCommand(key('h'))).toEqual({ type: 'hint' });
  expect(gameKeyboardCommand(key('p'))).toEqual({ type: 'pause' });
  for (const event of [
    key('Tab'),
    key('Enter'),
    key('h', { meta: true }),
    key('1', { shift: true }),
    key('ArrowLeft', { alt: true }),
    key('z', { meta: true, shift: true }),
  ]) {
    expect(gameKeyboardCommand(event)).toBeNull();
  }
});

test('board navigation starts at the first cell and never wraps across edges', () => {
  expect(moveKeyboardCell(null, 0, 1)).toBe(0);
  expect(moveKeyboardCell(8, 0, 1)).toBe(8);
  expect(moveKeyboardCell(9, 0, -1)).toBe(9);
  expect(moveKeyboardCell(0, -1, 0)).toBe(0);
  expect(moveKeyboardCell(80, 1, 0)).toBe(80);
  expect(moveKeyboardCell(40, -1, 0)).toBe(31);
});

test('registers only while playing, updates callbacks, and releases native input', async () => {
  const native = NativeProductExperience!;
  const remove = jest.fn();
  let emit: (event: HardwareKeyEvent) => void = () => {};
  (native.onHardwareKey as jest.Mock).mockImplementation(listener => {
    emit = listener;
    return { remove };
  });
  const first = jest.fn();
  const current = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <HardwareGameInput enabled onCommand={first} />,
    );
  });
  emit(key('1'));
  expect(first).toHaveBeenCalledWith({ type: 'digit', digit: 1 });
  await ReactTestRenderer.act(() => {
    renderer.update(<HardwareGameInput enabled onCommand={current} />);
  });
  emit(key('2'));
  expect(current).toHaveBeenCalledWith({ type: 'digit', digit: 2 });
  expect(native.onHardwareKey).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(() => {
    renderer.update(<HardwareGameInput enabled={false} onCommand={current} />);
  });
  expect(remove).toHaveBeenCalledTimes(1);
  expect(native.setHardwareInputEnabled).toHaveBeenLastCalledWith(false);
  await ReactTestRenderer.act(() => renderer.unmount());
});
