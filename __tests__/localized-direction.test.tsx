import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LocalizationProvider } from '../src/localization';
import { LocalizedText } from '../src/ui/components/LocalizedText';
import { LocalizedModal } from '../src/ui/components/LocalizedModal';
import { createGameInputStyles } from '../src/ui/components/game-input-styles';
import { lightPalette } from '../src/ui/theme';
import { AppIcon } from '../src/ui/components/AppIcon';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';

test('changing app language updates root and prose direction without restarting', async () => {
  let tree: renderer.ReactTestRenderer;
  const content = (locale: 'en' | 'ar') => (
    <LocalizationProvider locale={locale}>
      <LocalizedText testID="prose">العربية</LocalizedText>
      <LocalizedText testID="numeric">1 2 3</LocalizedText>
      <LocalizedText testID="center" style={{ textAlign: 'center' }}>
        العربية
      </LocalizedText>
    </LocalizationProvider>
  );
  await act(async () => {
    tree = renderer.create(content('en'));
  });
  await act(async () => {
    tree.update(content('ar'));
  });
  const text = (id: string) =>
    StyleSheet.flatten(
      tree.root.findAllByType(Text).find(item => item.props.testID === id)!
        .props.style,
    );
  expect(text('prose')).toMatchObject({
    writingDirection: 'rtl',
    textAlign: 'right',
  });
  expect(text('numeric')).toMatchObject({ writingDirection: 'ltr' });
  expect(text('center').textAlign).toBe('center');
  expect(
    StyleSheet.flatten(tree!.root.findAllByType(View)[0].props.style).direction,
  ).toBe('rtl');
  await act(async () => {
    tree.update(content('en'));
  });
  expect(text('prose').writingDirection).toBe('ltr');
  await act(async () => {
    tree.unmount();
  });
});

test('numeric keypad keeps 1–9 order inside an Arabic interface', () => {
  expect(createGameInputStyles(lightPalette).numberPad.direction).toBe('ltr');
});

test('Android uses natural alignment with an explicit RTL paragraph', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'android');
  let tree: renderer.ReactTestRenderer;
  try {
    await act(async () => {
      tree = renderer.create(
        <LocalizationProvider locale="ar">
          <LocalizedText>العربية</LocalizedText>
        </LocalizationProvider>,
      );
    });
    expect(
      StyleSheet.flatten(tree!.root.findByType(Text).props.style),
    ).toMatchObject({
      direction: 'rtl',
      writingDirection: 'rtl',
      textAlign: 'auto',
    });
  } finally {
    await act(async () => tree!.unmount());
    platform.restore();
  }
});

test('Arabic navigation arrows follow reading direction', async () => {
  let tree: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <LocalizationProvider locale="ar">
        <AppIcon name="back" color="#000" />
        <AppIcon name="forward" color="#000" />
      </LocalizationProvider>,
    );
  });
  expect(
    tree!.root.findAllByType(MaterialIcons).map(icon => icon.props.name),
  ).toEqual(['arrow-forward', 'arrow-back']);
  await act(async () => tree.unmount());
});

test('modal content receives Arabic direction across its native portal', async () => {
  let tree: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <LocalizationProvider locale="ar">
        <LocalizedModal visible>
          <LocalizedText>العربية</LocalizedText>
        </LocalizedModal>
      </LocalizationProvider>,
    );
  });
  const directions = tree!.root
    .findAllByType(View)
    .map(item => StyleSheet.flatten(item.props.style)?.direction);
  expect(
    directions.filter(value => value === 'rtl').length,
  ).toBeGreaterThanOrEqual(2);
  await act(async () => {
    tree.unmount();
  });
});
