import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  TestIds,
} from 'react-native-google-mobile-ads';
import type {
  TestAdGateway,
  TestAdShowResult,
} from '../../application/commercial/contracts';
import {
  isSupportedMarket,
  nativeStoreMarket,
  type StoreMarketProvider,
} from './google-mobile-ads-gateway';

/** Closed-test preview only: never accepts a production ID or grants rewards. */
export class GoogleTestAdGateway implements TestAdGateway {
  private closed = false;
  private busy = false;
  private initialized = false;
  private finish: ((result: TestAdShowResult) => void) | null = null;

  constructor(
    private readonly market: StoreMarketProvider = nativeStoreMarket,
  ) {}

  async show(): Promise<TestAdShowResult> {
    if (this.closed || this.busy) {
      return { status: 'unavailable', reason: 'operation_in_progress' };
    }
    this.busy = true;
    try {
      if (!isSupportedMarket(await this.market.getStoreCountryCode())) {
        return { status: 'unavailable', reason: 'market' };
      }
      const consent = await AdsConsent.gatherConsent();
      if (!consent.canRequestAds) {
        return { status: 'unavailable', reason: 'consent' };
      }
      if (!this.initialized) {
        await mobileAds().initialize();
        this.initialized = true;
      }
      if (this.closed) {
        return { status: 'unavailable', reason: 'sdk_unavailable' };
      }
      return await new Promise<TestAdShowResult>(resolve => {
        const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
          requestNonPersonalizedAdsOnly: true,
        });
        let settled = false;
        let shown = false;
        const timeout = setTimeout(
          () => finish({ status: 'unavailable', reason: 'not_loaded' }),
          30_000,
        );
        const finish = (result: TestAdShowResult) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          ad.removeAllListeners();
          this.finish = null;
          resolve(result);
        };
        this.finish = finish;
        ad.addAdEventListener(AdEventType.LOADED, () => {
          if (settled || shown) return;
          shown = true;
          clearTimeout(timeout);
          Promise.resolve()
            .then(() => (settled ? undefined : ad.show()))
            .catch(() =>
              finish({ status: 'failed', errorCode: 'show_failed' }),
            );
        });
        ad.addAdEventListener(AdEventType.CLOSED, () =>
          finish({ status: 'completed' }),
        );
        ad.addAdEventListener(AdEventType.ERROR, () =>
          finish({ status: 'failed', errorCode: 'test_ad_failed' }),
        );
        try {
          ad.load();
        } catch {
          finish({ status: 'failed', errorCode: 'load_failed' });
        }
      });
    } catch {
      return { status: 'failed', errorCode: 'test_ad_failed' };
    } finally {
      this.busy = false;
    }
  }

  async isPrivacyOptionsRequired(): Promise<boolean> {
    const consent = await AdsConsent.getConsentInfo();
    return (
      consent.privacyOptionsRequirementStatus ===
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  }

  async showPrivacyOptions(): Promise<boolean> {
    if (!isSupportedMarket(await this.market.getStoreCountryCode()))
      return false;
    await AdsConsent.showPrivacyOptionsForm();
    return true;
  }

  close(): void {
    this.closed = true;
    this.finish?.({ status: 'unavailable', reason: 'sdk_unavailable' });
  }
}

export function createClosedBetaTestAdGateway(
  closedBeta: boolean,
): TestAdGateway | undefined {
  return closedBeta && Platform.OS === 'android' && !Platform.isTV
    ? new GoogleTestAdGateway()
    : undefined;
}
