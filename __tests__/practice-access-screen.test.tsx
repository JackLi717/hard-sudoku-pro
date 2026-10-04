import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { LocalizationProvider } from '../src/localization';
import { ThemeProvider } from '../src/ui/theme';
import { TechniqueExerciseListScreen } from '../src/ui/screens/TechniqueExerciseListScreen';
import { PracticeBoardExercise } from '../src/ui/screens/PracticeBoardExercise';
import { bundledPracticeRepository } from '../src/data/practice/practice-catalog';

test('fish exercises enforce first-five access and unlock the next batch', async () => {
  let batches = 0;
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <LocalizationProvider locale="zh-Hans">
        <ThemeProvider preference="light">
          <TechniqueExerciseListScreen
            technique="swordfish"
            practiceRepository={bundledPracticeRepository}
            practiceAccess={{
              readUnlockedBatches: async () => batches,
              grantNextBatch: async () => 0,
            }}
            onUnlockPractice={async () => {
              batches += 1;
              return { status: 'unlocked', unlockedBatches: batches };
            }}
            onClose={() => undefined}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  expect(
    tree.root.findAllByProps({ testID: 'practice-select-6' }),
  ).toHaveLength(0);
  expect(
    tree.root.findAllByProps({ testID: 'practice-select-30' }),
  ).toHaveLength(0);
  expect(
    tree.root.findAllByProps({ testID: 'practice-access-count' }),
  ).toHaveLength(0);
  const boundaryOrder = () =>
    tree.root
      .findAll(node =>
        /^(practice-select-(5|6|10|11)|practice-unlock-next)$/.test(
          node.props.testID ?? '',
        ),
      )
      .map(node => node.props.testID)
      .filter((id, index, ids) => id !== ids[index - 1]);
  expect(boundaryOrder()).toEqual([
    'practice-select-5',
    'practice-unlock-next',
  ]);
  expect(
    tree.root.findByProps({ testID: 'practice-unlock-next' }).findByType(Text)
      .props.children,
  ).toBe('看广告解锁 5 题');
  await act(async () => {
    tree.root.findByProps({ testID: 'practice-select-5' }).props.onPress();
  });
  expect(tree.root.findByType(PracticeBoardExercise).props.hasNext).toBe(false);
  await act(async () =>
    tree.root.findByType(PracticeBoardExercise).props.onBack(),
  );
  await act(async () => {
    tree.root.findByProps({ testID: 'practice-unlock-next' }).props.onPress();
  });
  expect(tree.root.findByProps({ testID: 'practice-select-6' })).toBeTruthy();
  expect(tree.root.findByProps({ testID: 'practice-select-10' })).toBeTruthy();
  expect(
    tree.root.findAllByProps({ testID: 'practice-select-11' }),
  ).toHaveLength(0);
  expect(boundaryOrder().slice(-2)).toEqual([
    'practice-select-10',
    'practice-unlock-next',
  ]);
  await act(async () => tree.unmount());
});

test('Premium lists every exercise without an unlock control', async () => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <TechniqueExerciseListScreen
            technique="swordfish"
            premium
            practiceRepository={bundledPracticeRepository}
            onClose={() => undefined}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  expect(tree.root.findByProps({ testID: 'practice-select-30' })).toBeTruthy();
  expect(
    tree.root.findAllByProps({ testID: 'practice-unlock-next' }),
  ).toHaveLength(0);
  await act(async () => tree.unmount());
});
