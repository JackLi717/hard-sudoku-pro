import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  type ProductLocale,
} from '../src/application';
import type { DailyHintRewardHistory } from '../src/domain/game/hint-rewards';
import type { RewardedAdRedemptionResult } from '../src/application/commercial/contracts';
import { LocalizationProvider, translate } from '../src/localization';
import { SettingsScreen } from '../src/ui/screens/SettingsScreen';
import { ThemeProvider, darkPalette } from '../src/ui/theme';

const today = { date: '2026-10-04', cycleDay: 3, requested: 5, credited: 5 };
const history: DailyHintRewardHistory = {
  today: today.date,
  last: today,
  receipts: [
    today,
    { date: '2026-10-03', cycleDay: 2, requested: 3, credited: 3 },
    { date: '2026-10-02', cycleDay: 1, requested: 3, credited: 3 },
  ],
};
const renderers: ReactTestRenderer.ReactTestRenderer[] = [];
async function render(
  props: Partial<React.ComponentProps<typeof SettingsScreen>> = {},
  locale: ProductLocale = 'zh-Hans',
  theme: 'light' | 'dark' = 'light',
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <LocalizationProvider locale={locale}>
        <ThemeProvider preference={theme}>
          <SettingsScreen
            page="rewards"
            preferences={DEFAULT_PRODUCT_PREFERENCES}
            onBack={jest.fn()}
            onChange={jest.fn()}
            dailyHintRewards={history}
            hintRewardProgress={2}
            wallet={{
              smart_hint: {
                resource: 'smart_hint',
                balance: 18,
                earnedTotal: 20,
                spentTotal: 2,
              },
              quick_pencil: {
                resource: 'quick_pencil',
                balance: 3,
                earnedTotal: 3,
                spentTotal: 0,
              },
            }}
            {...props}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  renderers.push(renderer);
  return renderer;
}
afterEach(async () => {
  await act(() => {
    for (const r of renderers.splice(0)) r.unmount();
  });
});
const output = (r: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(r.toJSON());

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  'renders the current seven dated rewards and actual receipt in %s',
  async locale => {
    const r = await render({}, locale);
    expect(output(r)).toContain(
      translate(locale, 'rewards.received', { count: 5 }),
    );
    for (let d = 2; d <= 8; d++)
      expect(
        r.root.findByProps({ testID: `reward-day-2026-10-0${d}` }),
      ).toBeTruthy();
    expect(
      r.root.findByProps({ testID: 'reward-day-2026-10-04' }).props
        .accessibilityState.selected,
    ).toBe(true);
    expect(
      r.root.findByProps({ testID: 'reward-day-2026-10-03' }).props
        .accessibilityLabel,
    ).toContain(translate(locale, 'rewards.actual', { count: 3 }));
    expect(output(r)).not.toMatch(/\{\{\w+\}\}/);
    expect(output(r)).toContain(translate(locale, 'rewards.week'));
    expect(output(r)).not.toContain(
      translate(locale, 'credits.startingBalance'),
    );
    expect(output(r)).not.toContain(translate(locale, 'credits.dailyEarning'));
    expect(output(r)).not.toContain(
      translate(locale, 'credits.completionEarning'),
    );
    expect(output(r)).not.toContain(
      translate(locale, 'result.rewardProgress.remaining', { count: 1 }),
    );
    expect(output(r)).not.toContain(translate(locale, 'rewards.quickFree'));

    expect(r.root.findAllByProps({ testID: 'rewards-rules' })).toHaveLength(0);
    await act(() =>
      r.root.findByProps({ testID: 'rewards-rules-toggle' }).props.onPress(),
    );
    expect(output(r)).toContain(translate(locale, 'credits.startingBalance'));
    expect(output(r)).toContain(translate(locale, 'credits.dailyEarning'));
    expect(output(r)).toContain(translate(locale, 'credits.completionEarning'));
    expect(output(r)).toContain(translate(locale, 'credits.body'));
    expect(output(r)).toContain(translate(locale, 'credits.inventoryFull'));
    expect(output(r)).toContain(translate(locale, 'rewards.quickFree'));
  },
);

test.each([0, 3])(
  'uses the recorded partial/full receipt even after the balance has been spent: %s',
  async credited => {
    const receipt = { date: today.date, cycleDay: 6, requested: 10, credited };
    const r = await render({
      dailyHintRewards: {
        today: today.date,
        last: receipt,
        receipts: [receipt],
      },
    });
    expect(output(r)).toContain(
      translate('zh-Hans', 'rewards.received', { count: credited }),
    );
    expect(output(r)).not.toContain('不保留、不补发');
    await act(() =>
      r.root.findByProps({ testID: 'rewards-rules-toggle' }).props.onPress(),
    );
    expect(output(r)).toContain(
      translate(
        'zh-Hans',
        credited === 0 ? 'rewards.full' : 'rewards.partial',
        { count: 10, planned: 10, received: credited, lost: 10 - credited },
      ),
    );
    expect(
      r.root.findByProps({ testID: 'reward-day-2026-09-29' }),
    ).toBeTruthy();
  },
);

test('restart shows a new cycle and preserves the current balance', async () => {
  const receipt = { date: today.date, cycleDay: 1, requested: 3, credited: 3 };
  const r = await render({
    dailyHintRewards: {
      today: today.date,
      last: receipt,
      receipts: [
        receipt,
        { date: '2026-10-02', cycleDay: 2, requested: 3, credited: 3 },
      ],
    },
  });
  expect(output(r)).toContain(
    translate('zh-Hans', 'rewards.received', { count: 3 }),
  );
  expect(
    r.root.findByProps({ testID: 'rewards-balance' }).props.accessibilityLabel,
  ).toContain('18');
  expect(r.root.findByProps({ testID: 'reward-day-2026-10-10' })).toBeTruthy();
  expect(
    r.root.findAllByProps({ testID: 'reward-day-2026-10-02' }),
  ).toHaveLength(0);
});

test('does not invent a receipt while history is loading or the clock is rolled back', async () => {
  const loading = await render({ dailyHintRewards: undefined });
  expect(output(loading)).toContain(translate('zh-Hans', 'rewards.reading'));
  expect(loading.root.findAllByProps({ testID: 'rewards-week' })).toHaveLength(
    0,
  );
  const backwards = await render({
    dailyHintRewards: { ...history, today: '2026-10-03' },
  });
  expect(output(backwards)).toContain(translate('zh-Hans', 'rewards.clock'));
  expect(output(backwards)).not.toContain(
    translate('zh-Hans', 'rewards.received', { count: 3 }),
  );
});

test.each([
  ['permanent', false, false],
  ['beta', true, false],
  ['review', false, true],
] as const)(
  'Premium %s hides daily rewards and all advertising',
  async (kind, closedBetaPremium, reviewAccessPremium) => {
    const r = await render({
      premium: true,
      closedBetaPremium,
      reviewAccessPremium,
    });
    expect(output(r)).toContain(
      translate(
        'zh-Hans',
        kind === 'permanent'
          ? 'rewards.permanent'
          : kind === 'beta'
          ? 'rewards.beta'
          : 'rewards.review',
      ),
    );
    expect(r.root.findAllByProps({ testID: 'rewards-week' })).toHaveLength(0);
    expect(
      r.root.findAllByProps({ testID: 'rewards-ad-section' }),
    ).toHaveLength(0);
  },
);

test('an unavailable ad silently ends and the same button can try again', async () => {
  const redeem = jest
    .fn()
    .mockResolvedValueOnce({ status: 'unavailable', reason: 'not_loaded' })
    .mockResolvedValue({ status: 'dismissed' });
  const r = await render({ onRedeemHintAd: redeem });
  expect(redeem).not.toHaveBeenCalled();
  const press = () =>
    r.root.findByProps({ testID: 'rewards-open-ad' }).props.onPress();
  await act(press);
  expect(r.root.findByProps({ testID: 'rewards-open-ad' }).props.disabled).toBe(
    false,
  );
  expect(output(r)).not.toContain(translate('zh-Hans', 'credits.loadingAd'));
  expect(r.root.findAllByProps({ testID: 'rewards-recheck-ad' })).toHaveLength(
    0,
  );
  await act(press);
  expect(redeem).toHaveBeenCalledTimes(2);
});

test('94 can receive an ad, 95 cannot request or open one', async () => {
  const wallet = {
    smart_hint: {
      resource: 'smart_hint' as const,
      balance: 95,
      earnedTotal: 95,
      spentTotal: 0,
    },
    quick_pencil: {
      resource: 'quick_pencil' as const,
      balance: 3,
      earnedTotal: 3,
      spentTotal: 0,
    },
  };
  const full = await render({
    wallet,
    onRedeemHintAd: jest.fn(),
  });
  expect(full.root.findAllByProps({ testID: 'rewards-open-ad' })).toHaveLength(
    0,
  );
  expect(
    full.root.findAllByProps({ testID: 'rewards-ad-section' }),
  ).toHaveLength(0);
  const ready = await render({
    wallet: { ...wallet, smart_hint: { ...wallet.smart_hint, balance: 94 } },
    onRedeemHintAd: jest.fn(),
  });
  expect(
    ready.root.findByProps({ testID: 'rewards-open-ad' }).props.disabled,
  ).toBe(false);
});

test('one tap starts playback directly and rapid repeated taps cannot request a second ad', async () => {
  let finish!: (result: RewardedAdRedemptionResult) => void;
  const redeem = jest.fn(
    () =>
      new Promise<RewardedAdRedemptionResult>(resolve => {
        finish = resolve;
      }),
  );
  const r = await render({ onRedeemHintAd: redeem });
  const press = r.root.findByProps({ testID: 'rewards-open-ad' }).props.onPress;
  let playback!: Promise<void>;
  await act(() => {
    playback = press();
    press();
  });
  expect(redeem).toHaveBeenCalledTimes(1);
  expect(r.root.findByProps({ testID: 'rewards-open-ad' }).props.disabled).toBe(
    true,
  );
  expect(output(r)).toContain(translate('zh-Hans', 'credits.watching'));
  await act(async () => {
    finish({ status: 'dismissed' });
    await playback;
  });
  expect(output(r)).not.toContain(translate('zh-Hans', 'credits.dismissed'));
  expect(r.root.findByProps({ testID: 'rewards-open-ad' }).props.disabled).toBe(
    false,
  );
});

test.each([
  [
    { status: 'credited', grant: { credited: 5, wallet: {} } },
    'credits.rewardSuccess',
  ],
  [{ status: 'dismissed' }, 'credits.dismissed'],
  [{ status: 'unavailable', reason: 'not_loaded' }, 'credits.unavailable'],
  [{ status: 'failed', errorCode: 'show_failed' }, 'credits.failed'],
] as const)(
  'ends the ad operation without extra result text: %s',
  async (result, message) => {
    const redeem = jest.fn().mockResolvedValue(result);
    const r = await render({ onRedeemHintAd: redeem });
    await act(() =>
      r.root.findByProps({ testID: 'rewards-open-ad' }).props.onPress(),
    );
    expect(output(r)).not.toContain(translate('zh-Hans', message));
    expect(r.root.findAllByProps({ testID: 'rewards-ad-result' })).toHaveLength(
      0,
    );
    expect(
      r.root.findByProps({ testID: 'rewards-open-ad' }).props.disabled,
    ).toBe(false);
    if (result.status === 'credited') {
      const props = r.root.findByType(SettingsScreen)
        .props as React.ComponentProps<typeof SettingsScreen>;
      const wallet = props.wallet!;
      await act(() =>
        r.update(
          <LocalizationProvider locale="zh-Hans">
            <ThemeProvider preference="light">
              <SettingsScreen
                {...props}
                wallet={{
                  ...wallet,
                  smart_hint: { ...wallet.smart_hint, balance: 99 },
                }}
              />
            </ThemeProvider>
          </LocalizationProvider>,
        ),
      );
      expect(r.root.findAllByProps({ testID: 'rewards-open-ad' })).toHaveLength(
        0,
      );
      expect(
        r.root.findByProps({ testID: 'rewards-balance' }).props
          .accessibilityLabel,
      ).toContain('99');
      expect(
        r.root.findAllByProps({ testID: 'rewards-ad-section' }),
      ).toHaveLength(0);
    }
  },
);

test('playback exceptions silently end and allow another attempt', async () => {
  const redeem = jest.fn().mockRejectedValue(new Error('SDK failed'));
  const r = await render({ onRedeemHintAd: redeem });
  await act(() =>
    r.root.findByProps({ testID: 'rewards-open-ad' }).props.onPress(),
  );
  expect(output(r)).not.toContain(translate('zh-Hans', 'credits.failed'));
  await act(() =>
    r.root.findByProps({ testID: 'rewards-open-ad' }).props.onPress(),
  );
  expect(redeem).toHaveBeenCalledTimes(2);
  expect(r.root.findByProps({ testID: 'rewards-open-ad' }).props.disabled).toBe(
    false,
  );
});

test('dark theme highlights today with the theme accent', async () => {
  const r = await render({}, 'zh-Hans', 'dark');
  const style = StyleSheet.flatten(
    r.root.findByProps({ testID: 'reward-day-2026-10-04' }).props.style,
  );
  expect(style.backgroundColor).toBe(darkPalette.accent);
});

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  'reuses the existing ad button for a closed-test Premium preview in %s',
  async locale => {
    const preview = jest.fn(async () => ({ status: 'completed' as const }));
    const redeem = jest.fn();
    const r = await render(
      {
        premium: true,
        closedBetaPremium: true,
        onShowTestAd: preview,
        onRedeemHintAd: redeem,
      },
      locale,
    );
    expect(r.root.findByProps({ testID: 'rewards-ad-section' })).toBeTruthy();
    expect(output(r)).toContain(translate(locale, 'rewards.testAd'));
    expect(output(r)).toContain(translate(locale, 'rewards.testAdBody'));
    expect(output(r)).not.toContain(translate(locale, 'credits.watch'));
    expect(preview).not.toHaveBeenCalled();
    await act(() =>
      r.root.findByProps({ testID: 'rewards-open-ad' }).props.onPress(),
    );
    expect(preview).toHaveBeenCalledTimes(1);
    expect(redeem).not.toHaveBeenCalled();
    expect(output(r)).toContain(translate(locale, 'rewards.testAdClosed'));
    expect(
      r.root.findByProps({ testID: 'rewards-balance' }).props
        .accessibilityLabel,
    ).toContain(translate(locale, 'premium.benefitUnlimitedHints'));
    expect(r.root.findAllByProps({ testID: 'rewards-week' })).toHaveLength(0);
  },
);

test('permanent Premium in a closed-test build can test ads even with a full wallet', async () => {
  const preview = jest.fn(async () => ({
    status: 'unavailable' as const,
    reason: 'offline',
  }));
  const r = await render({
    premium: true,
    closedBetaPremium: false,
    onShowTestAd: preview,
    wallet: {
      smart_hint: {
        resource: 'smart_hint',
        balance: 99,
        earnedTotal: 99,
        spentTotal: 0,
      },
      quick_pencil: {
        resource: 'quick_pencil',
        balance: 0,
        earnedTotal: 0,
        spentTotal: 0,
      },
    },
  });
  const press = () =>
    r.root.findByProps({ testID: 'rewards-open-ad' }).props.onPress();
  await act(press);
  expect(output(r)).toContain(
    translate('zh-Hans', 'rewards.testAdUnavailable'),
  );
  expect(r.root.findByProps({ testID: 'rewards-open-ad' }).props.disabled).toBe(
    false,
  );
  await act(press);
  expect(preview).toHaveBeenCalledTimes(2);
});

test('free users keep the normal +5 reward path even if a preview callback is supplied', async () => {
  const preview = jest.fn();
  const redeem = jest.fn(async () => ({ status: 'dismissed' as const }));
  const r = await render({ onShowTestAd: preview, onRedeemHintAd: redeem });
  expect(output(r)).toContain(translate('zh-Hans', 'credits.watch'));
  expect(output(r)).not.toContain(translate('zh-Hans', 'rewards.testAdBody'));
  await act(() =>
    r.root.findByProps({ testID: 'rewards-open-ad' }).props.onPress(),
  );
  expect(redeem).toHaveBeenCalledTimes(1);
  expect(preview).not.toHaveBeenCalled();
});
