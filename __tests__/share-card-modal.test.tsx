import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { boardFromFingerprint } from '../src/domain/sudoku/board';
import type { Board } from '../src/domain/sudoku/contracts';
import { LocalizationProvider } from '../src/localization';
import { ShareCardContent } from '../src/ui/screens/ShareCardModal';
import type { ShareCardFacts } from '../src/ui/screens/share-card-presentation';
import { ThemeProvider } from '../src/ui/theme';

const solved = boardFromFingerprint(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
);
const givens = solved.map((value, index) =>
  index % 3 === 0 ? value : null,
) as Board;

async function renderCard(facts: ShareCardFacts) {
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => {
    renderer = Renderer.create(
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <ShareCardContent facts={facts} onClose={jest.fn()} />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  return renderer;
}

function cardText(renderer: Renderer.ReactTestRenderer): string {
  const flattenText = (value: unknown): string => {
    if (Array.isArray(value)) return value.map(flattenText).join('');
    if (React.isValidElement<{ children?: React.ReactNode }>(value)) {
      return flattenText(value.props.children);
    }
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : '';
  };
  return renderer.root
    .findByProps({ testID: 'share-card' })
    .findAllByType(Text)
    .map(node => flattenText(node.props.children))
    .join(' ');
}

test('only a verified new result receives the record badge', async () => {
  const facts: ShareCardFacts = {
    kind: 'result',
    isNewRecord: true,
    boardSnapshot: { givens, values: solved },
    difficultyLevel: 3,
    elapsedMs: 1_205_000,
    mistakes: 0,
    hints: 4,
  };
  const renderer = await renderCard(facts);
  const text = cardText(renderer);
  expect(text).toContain('NEW RECORD');
  expect(text).toContain('Solved without mistakes');
  expect(text).toContain('20:05');
  expect(text).toContain('4 hints');
  expect(text).toContain('Can you beat my time?');
  await act(async () => renderer.unmount());

  const ordinary = await renderCard({ ...facts, isNewRecord: false });
  expect(cardText(ordinary)).toContain('Solved without mistakes');
  expect(cardText(ordinary)).not.toContain('PUZZLE SOLVED');
  expect(cardText(ordinary)).not.toContain('NEW RECORD');
  await act(async () => ordinary.unmount());
});

test('current-board card uses replay facts instead of final result claims', async () => {
  const values = [...solved];
  values[0] = null;
  const renderer = await renderCard({
    kind: 'current_board',
    boardSnapshot: { givens, values },
    difficultyLevel: 3,
    step: 2,
    totalSteps: 15,
  });
  const text = cardText(renderer);
  expect(text).toContain('REPLAY · STEP 2');
  expect(text).toContain('Can you find the next move?');
  expect(text).not.toContain('Board at this step');
  expect(text).toContain('Can you solve from here?');
  expect(text).not.toContain('20:05');
  expect(text).not.toContain('Solved without mistakes');
  await act(async () => renderer.unmount());
});

test('final replay frame does not ask for a next move', async () => {
  const renderer = await renderCard({
    kind: 'current_board',
    boardSnapshot: { givens, values: solved },
    difficultyLevel: 3,
    step: 15,
    totalSteps: 15,
  });
  const text = cardText(renderer);
  expect(text).toContain('REPLAY · STEP 15');
  expect(text).toContain('Puzzle solved');
  expect(text).not.toContain('Can you find the next move?');
  await act(async () => renderer.unmount());
});
