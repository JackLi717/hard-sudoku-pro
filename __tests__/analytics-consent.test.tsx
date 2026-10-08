import React from 'react';
import { Switch } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ProductPreferencesController } from '../src/application/app/product-preferences';
import { LocalizationProvider } from '../src/localization';
import { ThemeProvider } from '../src/ui/theme';
import { TelemetryConsent } from '../src/ui/components/TelemetryConsent';

async function renderConsent() {
  const updatePreferences = jest.fn(async () => {});
  let renderer!: Renderer.ReactTestRenderer;
  await act(async () => {
    renderer = Renderer.create(
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <TelemetryConsent
            preferences={
              { updatePreferences } as unknown as ProductPreferencesController
            }
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  return { renderer, updatePreferences };
}

test('both choices default off; diagnosis can be enabled independently', async () => {
  const { renderer, updatePreferences } = await renderConsent();
  const switches = renderer.root.findAllByType(Switch);
  expect(switches.map(item => item.props.value)).toEqual([false, false]);
  await act(async () => switches[1].props.onValueChange(true));
  await act(async () =>
    renderer.root
      .findByProps({ accessibilityLabel: 'Save choices' })
      .props.onPress(),
  );
  expect(updatePreferences).toHaveBeenCalledWith({
    analyticsEnabled: false,
    diagnosticsEnabled: true,
    telemetryConsentDecided: true,
  });
  await act(async () => renderer.unmount());
});

test('continue without sharing overrides toggles and persist failure offers retry', async () => {
  const { renderer, updatePreferences } = await renderConsent();
  updatePreferences.mockRejectedValueOnce(new Error('storage unavailable'));
  await act(async () =>
    renderer.root.findAllByType(Switch)[0].props.onValueChange(true),
  );
  await act(async () =>
    renderer.root
      .findByProps({ accessibilityLabel: 'Continue without sharing' })
      .props.onPress(),
  );
  expect(updatePreferences).toHaveBeenLastCalledWith({
    analyticsEnabled: false,
    diagnosticsEnabled: false,
    telemetryConsentDecided: true,
  });
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Could not save your choices',
  );
  await act(async () =>
    renderer.root
      .findByProps({ accessibilityLabel: 'Continue without sharing' })
      .props.onPress(),
  );
  expect(updatePreferences).toHaveBeenCalledTimes(2);
  await act(async () => renderer.unmount());
});
