import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { LocalizationProvider } from '../src/localization';
import { MultiSelectOnboardingOverlay } from '../src/ui/components/MultiSelectOnboardingOverlay';
import { ThemeProvider } from '../src/ui/theme';

test('leaves the selected board cell visible and positions the teaching card away from it', async () => {
  const dismiss = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <MultiSelectOnboardingOverlay
            boardRect={{ x: 12, y: 80, width: 360, height: 360 }}
            onDismiss={dismiss}
            selectedCell={40}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });

  const spotlight = StyleSheet.flatten(
    renderer.root.findByProps({ testID: 'multi-select-onboarding-spotlight' })
      .props.style,
  );
  expect(spotlight).toMatchObject({
    left: 170,
    top: 238,
    width: 44,
    height: 44,
  });
  const card = StyleSheet.flatten(
    renderer.root.findByProps({ testID: 'multi-select-onboarding-card' }).props
      .style,
  );
  expect(card.top + 190).toBeLessThan(spotlight.top);
  expect(dismiss).not.toHaveBeenCalled();

  await ReactTestRenderer.act(() => renderer.unmount());
});
