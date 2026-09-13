import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Modal } from 'react-native';
import { LocalizationProvider } from '../src/localization';
import { LevelPickerModal } from '../src/ui/components/LevelPickerModal';
import { ThemeProvider } from '../src/ui/theme';

const completedByLevel = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 } as const;

function renderPicker({
  busy = false,
  onClose = jest.fn(),
  onSelect = jest.fn(),
}: {
  busy?: boolean;
  onClose?: () => void;
  onSelect?: (level: 1 | 2 | 3 | 4 | 5) => void;
} = {}) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="en">
      <ThemeProvider preference="light">
        <LevelPickerModal
          busy={busy}
          completedByLevel={completedByLevel}
          onClose={onClose}
          onSelect={onSelect}
          visible
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('LevelPickerModal', () => {
  test('renders all level facts and returns the selected level', async () => {
    const onSelect = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderPicker({ onSelect });
    });

    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Start Hard, 3 completed',
      }).props.accessibilityHint,
    ).toBe('Intermediate patterns and interactions');
    for (const level of [1, 2, 3, 4, 5]) {
      expect(
        renderer.root.findByProps({ testID: `level-picker-option-${level}` }),
      ).toBeTruthy();
    }

    await act(async () =>
      renderer.root
        .findByProps({ testID: 'level-picker-option-4' })
        .props.onPress(),
    );
    expect(onSelect).toHaveBeenCalledWith(4);
    await act(async () => renderer.unmount());
  });

  test('closes from the backdrop and the platform modal request', async () => {
    const onClose = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderPicker({ onClose });
    });

    await act(async () =>
      renderer.root
        .findByProps({ testID: 'level-picker-backdrop' })
        .props.onPress(),
    );
    await act(async () =>
      renderer.root.findByType(Modal).props.onRequestClose(),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
    await act(async () => renderer.unmount());
  });

  test('disables every level while its owner is busy', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderPicker({ busy: true });
    });

    for (const level of [1, 2, 3, 4, 5]) {
      const option = renderer.root.findByProps({
        testID: `level-picker-option-${level}`,
      });
      expect(option.props.disabled).toBe(true);
      expect(option.props.accessibilityState).toEqual({ disabled: true });
    }
    await act(async () => renderer.unmount());
  });
});
