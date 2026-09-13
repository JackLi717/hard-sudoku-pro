import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type {
  CommercialSnapshot,
  PurchaseResult,
  RestoreResult,
} from '../src/application/commercial/contracts';
import type { ProductLocale } from '../src/application';
import { LocalizationProvider, translate } from '../src/localization';
import {
  CreditTopUpModal,
  PremiumScreen,
  TrustScreen,
} from '../src/ui/screens/CommercialScreens';
import { ThemeProvider } from '../src/ui/theme';

const LOCALES: readonly ProductLocale[] = ['en', 'ja', 'de', 'zh-Hans'];

const commercialSnapshot: CommercialSnapshot = {
  entitlement: {
    status: 'free',
    source: 'local_cache',
    refreshing: false,
    lastVerifiedAtEpochMs: null,
    originalTransactionId: null,
  },
  products: [
    {
      id: 'premium',
      title: 'Premium',
      description: 'Permanent Premium',
      displayPrice: '$9.99',
    },
  ],
  wallet: {
    quick_pencil: {
      resource: 'quick_pencil',
      balance: 3,
      earnedTotal: 3,
      spentTotal: 0,
    },
    smart_hint: {
      resource: 'smart_hint',
      balance: 5,
      earnedTotal: 5,
      spentTotal: 0,
    },
  },
  purchaseBusy: false,
  restoreBusy: false,
  rewardedAdBusy: false,
};

function render(locale: ProductLocale, child: React.ReactNode) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale={locale}>
      <ThemeProvider preference="light">{child}</ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('commercial UI', () => {
  test.each(LOCALES)('renders Premium and trust copy in %s', async locale => {
    let premium!: ReactTestRenderer.ReactTestRenderer;
    let privacy!: ReactTestRenderer.ReactTestRenderer;
    let support!: ReactTestRenderer.ReactTestRenderer;
    let licenses!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      premium = render(
        locale,
        <PremiumScreen
          onBack={jest.fn()}
          onLoadProduct={jest.fn().mockResolvedValue(undefined)}
          onPurchase={jest.fn()}
          onRestore={jest.fn()}
          snapshot={commercialSnapshot}
        />,
      );
      privacy = render(
        locale,
        <TrustScreen
          onBack={jest.fn()}
          onPrivacyOptionsRequired={jest.fn().mockResolvedValue(false)}
          page="privacy"
        />,
      );
      support = render(
        locale,
        <TrustScreen onBack={jest.fn()} page="support" />,
      );
      licenses = render(
        locale,
        <TrustScreen onBack={jest.fn()} page="licenses" />,
      );
    });

    const output = [premium, privacy, support, licenses]
      .map(renderer => JSON.stringify(renderer.toJSON()))
      .join('\n');
    expect(output).toContain('$9.99');
    expect(output).toContain(translate(locale, 'premium.oneTime'));
    expect(output).toContain(translate(locale, 'premium.benefitFinite'));
    expect(output).toContain(translate(locale, 'trust.privacyAdsTitle'));
    expect(output).toContain(translate(locale, 'trust.supportPurchaseTitle'));
    expect(output).toContain('react-native-google-mobile-ads');
    expect(output).not.toMatch(/\{\{\w+\}\}/);

    await ReactTestRenderer.act(() => {
      premium.unmount();
      privacy.unmount();
      support.unmount();
      licenses.unmount();
    });
  });

  test('shows pending, cancellation, failure, and restore outcomes distinctly', async () => {
    const purchase = jest
      .fn<Promise<PurchaseResult>, []>()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'cancelled' })
      .mockResolvedValueOnce({
        status: 'failed',
        errorCode: 'purchase_failed',
      });
    const restore = jest
      .fn<Promise<RestoreResult>, []>()
      .mockResolvedValue({ status: 'nothing_to_restore' });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = render(
        'en',
        <PremiumScreen
          onBack={jest.fn()}
          onLoadProduct={jest.fn().mockResolvedValue(undefined)}
          onPurchase={purchase}
          onRestore={restore}
          snapshot={commercialSnapshot}
        />,
      );
    });

    const buy = () =>
      renderer.root
        .findByProps({
          accessibilityLabel: 'Get Lifetime Premium · $9.99',
        })
        .props.onPress();
    await ReactTestRenderer.act(async () => buy());
    expect(text(renderer)).toContain('pending store approval');
    await ReactTestRenderer.act(async () => buy());
    expect(text(renderer)).toContain('Purchase cancelled');
    await ReactTestRenderer.act(async () => buy());
    expect(text(renderer)).toContain('could not be completed');

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Restore purchase' })
        .props.onPress(),
    );
    expect(text(renderer)).toContain('No Premium purchase was found');
  });

  test('uses the storefront price for its single lifetime offer', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = render(
        'en',
        <PremiumScreen
          onBack={jest.fn()}
          onLoadProduct={jest.fn().mockResolvedValue(undefined)}
          onPurchase={jest.fn()}
          onRestore={jest.fn()}
          snapshot={{
            ...commercialSnapshot,
            products: [
              { ...commercialSnapshot.products[0], displayPrice: '€11,99' },
            ],
          }}
        />,
      );
    });
    expect(text(renderer)).toContain('€11,99');
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Get Lifetime Premium · €11,99',
      }),
    ).toBeTruthy();
    expect(text(renderer)).not.toContain('$9.99');
    expect(text(renderer)).not.toContain('Unlimited');
    expect(text(renderer)).not.toContain('Subscribe');
  });

  test('previews the test price without enabling a purchase when no product exists', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = render(
        'en',
        <PremiumScreen
          onBack={jest.fn()}
          onLoadProduct={jest.fn().mockRejectedValue(new Error('offline'))}
          onPurchase={jest.fn()}
          onRestore={jest.fn()}
          snapshot={{ ...commercialSnapshot, products: [] }}
        />,
      );
    });
    expect(text(renderer)).toContain('US$9.99');
    expect(text(renderer)).toContain('TEST PRICE · PURCHASE UNAVAILABLE');
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Get Lifetime Premium',
      }).props.accessibilityState.disabled,
    ).toBe(true);
  });

  test('requires an explicit choice and credits only the selected resource', async () => {
    const check = jest.fn().mockResolvedValue({ status: 'available' });
    const redeem = jest.fn().mockResolvedValue({
      status: 'credited',
      grant: {
        credited: 1,
        wallet: commercialSnapshot.wallet,
      },
    });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = render(
        'en',
        <CreditTopUpModal
          balance={0}
          onCheckAvailability={check}
          onClose={jest.fn()}
          onRedeem={redeem}
          resource="quick_pencil"
          visible
        />,
      );
    });

    expect(redeem).not.toHaveBeenCalled();
    expect(text(renderer)).toContain('Add one quick note');
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Watch ad · +1' })
        .props.onPress(),
    );
    expect(redeem).toHaveBeenCalledTimes(1);
    expect(text(renderer)).toContain('selected resource');
  });

  test('keeps processing and unavailable states explicit and non-blocking', async () => {
    let premium!: ReactTestRenderer.ReactTestRenderer;
    let credits!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      premium = render(
        'en',
        <PremiumScreen
          onBack={jest.fn()}
          onLoadProduct={jest.fn().mockResolvedValue(undefined)}
          onPurchase={jest.fn()}
          onRestore={jest.fn()}
          snapshot={{ ...commercialSnapshot, purchaseBusy: true }}
        />,
      );
      credits = render(
        'en',
        <CreditTopUpModal
          balance={0}
          onCheckAvailability={jest
            .fn()
            .mockResolvedValue({ status: 'unavailable', reason: 'offline' })}
          onClose={jest.fn()}
          onRedeem={jest.fn()}
          resource="smart_hint"
          visible
        />,
      );
    });

    expect(text(premium)).toContain('Purchasing…');
    expect(
      premium.root.findByProps({ accessibilityLabel: 'Purchasing…' }).props
        .accessibilityState,
    ).toEqual({ busy: true, disabled: true });
    expect(text(credits)).toContain('Ads are unavailable while offline');
    expect(
      credits.root.findByProps({ accessibilityLabel: 'Cancel' }),
    ).toBeTruthy();
    expect(
      credits.root.findAllByProps({ accessibilityLabel: 'Watch ad · +1' }),
    ).toHaveLength(0);
  });

  test('offers UMP privacy controls only when required', async () => {
    const show = jest.fn().mockResolvedValue(true);
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = render(
        'en',
        <TrustScreen
          onBack={jest.fn()}
          onPrivacyOptionsRequired={jest.fn().mockResolvedValue(true)}
          onShowPrivacyOptions={show}
          page="privacy"
        />,
      );
    });
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Manage ad privacy choices' })
        .props.onPress(),
    );
    expect(show).toHaveBeenCalledTimes(1);
    expect(text(renderer)).toContain('latest choice was applied');
  });
});

function text(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}
