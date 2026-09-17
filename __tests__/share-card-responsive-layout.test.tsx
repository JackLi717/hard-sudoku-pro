import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ScrollView, StyleSheet } from 'react-native';
import { boardFromFingerprint } from '../src/domain/sudoku/board';
import type { Board } from '../src/domain/sudoku/contracts';
import { LocalizationProvider } from '../src/localization';
import {
  resolveShareCardWidth,
  ShareCardContent,
} from '../src/ui/screens/ShareCardModal';
import type { ShareCardFacts } from '../src/ui/screens/share-card-presentation';
import { ThemeProvider } from '../src/ui/theme';

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

const solved = boardFromFingerprint(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
);
const givens = solved.map((value, index) =>
  index % 3 === 0 ? value : null,
) as Board;
const facts: ShareCardFacts = {
  kind: 'result',
  isNewRecord: true,
  boardSnapshot: { givens, values: solved },
  difficultyLevel: 3,
  elapsedMs: 1_205_000,
  mistakes: 0,
  hints: 4,
};

function renderCard() {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="zh-Hans">
      <ThemeProvider preference="light">
        <ShareCardContent facts={facts} onClose={jest.fn()} />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('Share card responsive layout', () => {
  afterEach(() => {
    mockLandscapeTabletLayout = false;
  });

  test('keeps the phone fallback scrollable', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderCard();
    });

    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(1);
    expect(
      renderer.root.findAllByProps({ testID: 'share-card-tablet-static' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  test('fits the tablet card to height without changing phone sizing', () => {
    expect(
      resolveShareCardWidth({ height: 752, tablet: true, width: 1280 }),
    ).toBe(352);
    expect(
      resolveShareCardWidth({ height: 752, tablet: false, width: 1280 }),
    ).toBe(390);
  });

  test('uses a static centered group with a card-width action on landscape tablet', async () => {
    mockLandscapeTabletLayout = true;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderCard();
    });

    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(0);
    const group = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'share-card-tablet-static' }).props
        .style,
    );
    const card = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'share-card-shell' }).props.style,
    );
    const actions = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'share-card-actions' }).props.style,
    );
    expect(group).toMatchObject({ flex: 1, justifyContent: 'center', gap: 14 });
    expect(actions).toMatchObject({
      paddingHorizontal: 0,
      paddingVertical: 0,
      width: card.width,
    });
    await act(async () => renderer.unmount());
  });
});
