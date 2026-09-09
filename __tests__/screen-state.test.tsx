import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { ScrollView, Text } from 'react-native';
import {
  ScreenStateProvider,
  useScreenState,
  useScreenScroll,
} from '../src/ui/screen-state';

function Page({ identity }: { identity: string }) {
  const [value, setValue] = useScreenState(`${identity}:choice`, 0);
  const scroll = useScreenScroll(identity);
  return (
    <ScrollView {...scroll}>
      <Text onPress={() => setValue(current => current + 1)}>{value}</Text>
    </ScrollView>
  );
}

test('remount restores choices and scroll, keys isolate pages, and a fresh app clears navigation memory', () => {
  let renderer!: Renderer.ReactTestRenderer;
  const render = (identity: string | null) => (
    <ScreenStateProvider>
      {identity && <Page identity={identity} />}
    </ScreenStateProvider>
  );
  act(() => {
    renderer = Renderer.create(render('a'));
  });
  act(() => renderer.root.findByType(Text).props.onPress());
  const initialOffset =
    renderer.root.findByType(ScrollView).props.contentOffset;
  act(() =>
    renderer.root
      .findByType(ScrollView)
      .props.onScroll({ nativeEvent: { contentOffset: { x: 0, y: 240 } } }),
  );
  // Scrolling cannot feed a changed controlled offset back into the live view.
  expect(renderer.root.findByType(ScrollView).props.contentOffset).toBe(
    initialOffset,
  );
  act(() => renderer.update(render(null)));
  act(() => renderer.update(render('a')));
  expect(renderer.root.findByType(Text).props.children).toBe(1);
  expect(renderer.root.findByType(ScrollView).props.contentOffset).toEqual({
    x: 0,
    y: 240,
  });
  act(() => renderer.update(render('b')));
  expect(renderer.root.findByType(Text).props.children).toBe(0);
  expect(renderer.root.findByType(ScrollView).props.contentOffset).toEqual({
    x: 0,
    y: 0,
  });
  act(() => renderer.update(render('a')));
  expect(renderer.root.findByType(Text).props.children).toBe(1);
  act(() => renderer.unmount());
  act(() => {
    renderer = Renderer.create(render('a'));
  });
  expect(renderer.root.findByType(Text).props.children).toBe(0);
  act(() => renderer.unmount());
});
