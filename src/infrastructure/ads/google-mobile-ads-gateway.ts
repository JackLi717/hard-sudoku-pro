import {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  default as mobileAds,
  type RewardedAd as GoogleRewardedAd,
} from 'react-native-google-mobile-ads';
import type {
  AdAvailability,
  AdFormat,
  AdGateway,
  AdPlacement,
  AdShowResult,
  RewardedAdReward,
} from '../../application/commercial/contracts';
import NativeAdMarket from '../../native/NativeAdMarket';

const APPROVED_PLACEMENTS = new Set<AdPlacement>([
  'home_credit_store',
  'credit_exhausted',
]);

type UnavailableReason = Extract<
  AdAvailability,
  { status: 'unavailable' }
>['reason'];

export interface StoreMarketProvider {
  getStoreCountryCode(): Promise<string | null>;
}

const nativeStoreMarket: StoreMarketProvider = {
  async getStoreCountryCode() {
    if (!NativeAdMarket) return null;
    try {
      return await NativeAdMarket.getStoreCountryCode();
    } catch {
      return null;
    }
  },
};

function unavailable(reason: UnavailableReason): AdAvailability {
  return { status: 'unavailable', reason };
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return 'unknown';
}

function availabilityReason(error: unknown): UnavailableReason {
  const code = errorCode(error).toLowerCase();
  return code.includes('network') ? 'offline' : 'not_loaded';
}

function isSupportedMarket(countryCode: string | null): boolean {
  if (!countryCode) return false;
  const normalized = countryCode.trim().toUpperCase();
  return normalized !== 'CN' && normalized !== 'CHN';
}

export type GoogleMobileAdsGatewayOptions = {
  rewardedAdUnitId: string | null;
  storeMarket?: StoreMarketProvider;
};

/**
 * The only production advertising adapter. It deliberately has no
 * interstitial implementation: the first release permits opt-in rewarded ads
 * only. Wallet mutations remain in CommercialController/CommercialStore.
 */
export class GoogleMobileAdsGateway implements AdGateway {
  private readonly storeMarket: StoreMarketProvider;
  private initialized = false;
  private initialization: Promise<void> | null = null;
  private closed = false;
  private consentAllowsAds = false;
  private marketAllowsAds = false;
  private rewardedAd: GoogleRewardedAd | null = null;
  private rewardedLoaded = false;
  private loadReason: UnavailableReason = 'not_loaded';
  private loadPromise: Promise<void> | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly options: GoogleMobileAdsGatewayOptions) {
    this.storeMarket = options.storeMarket ?? nativeStoreMarket;
  }

  async initialize(): Promise<void> {
    if (this.closed || this.initialized) return;
    if (this.initialization) return this.initialization;
    this.initialization = this.initializeOnce();
    try {
      await this.initialization;
    } finally {
      this.initialization = null;
    }
  }

  private async initializeOnce(): Promise<void> {
    if (!this.options.rewardedAdUnitId) {
      this.loadReason = 'sdk_unavailable';
      return;
    }
    const countryCode = await this.storeMarket.getStoreCountryCode();
    this.marketAllowsAds = isSupportedMarket(countryCode);
    if (!this.marketAllowsAds) {
      this.loadReason = 'market';
      return;
    }
    try {
      const consent = await AdsConsent.gatherConsent();
      this.consentAllowsAds = consent.canRequestAds;
      if (!this.consentAllowsAds) {
        this.loadReason = 'consent';
        return;
      }
      await mobileAds().initialize();
      this.initialized = true;
      this.preload('rewarded', 'home_credit_store').catch(() => undefined);
    } catch (error) {
      this.consentAllowsAds = false;
      this.loadReason = availabilityReason(error);
    }
  }

  async getAvailability(
    format: AdFormat,
    placement: AdPlacement,
  ): Promise<AdAvailability> {
    if (
      this.closed ||
      format !== 'rewarded' ||
      !APPROVED_PLACEMENTS.has(placement) ||
      !this.options.rewardedAdUnitId
    ) {
      return unavailable('sdk_unavailable');
    }

    const countryCode = await this.storeMarket.getStoreCountryCode();
    this.marketAllowsAds = isSupportedMarket(countryCode);
    if (!this.marketAllowsAds) {
      this.disposeRewardedAd();
      this.loadReason = 'market';
      return unavailable('market');
    }
    if (!this.initialized) await this.initialize();
    if (!this.consentAllowsAds) return unavailable(this.loadReason);
    if (this.rewardedLoaded) return { status: 'available' };
    const reason = this.loadReason;
    this.preload(format, placement).catch(() => undefined);
    return unavailable(reason);
  }

  async preload(format: AdFormat, placement: AdPlacement): Promise<void> {
    if (
      this.closed ||
      !this.initialized ||
      !this.consentAllowsAds ||
      !this.marketAllowsAds ||
      format !== 'rewarded' ||
      !APPROVED_PLACEMENTS.has(placement) ||
      !this.options.rewardedAdUnitId ||
      this.rewardedLoaded
    ) {
      return;
    }
    if (this.loadPromise) return this.loadPromise;

    this.disposeRewardedAd();
    const ad = RewardedAd.createForAdRequest(this.options.rewardedAdUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    this.rewardedAd = ad;
    this.loadReason = 'not_loaded';
    let resolveLoad: () => void = () => undefined;
    let loadFinished = false;
    const loadPromise = new Promise<void>(resolve => {
      resolveLoad = resolve;
    });
    const finish = () => {
      if (loadFinished) return;
      loadFinished = true;
      this.loadPromise = null;
      resolveLoad();
    };
    this.loadPromise = loadPromise;
    this.unsubscribers.push(
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.rewardedLoaded = true;
        finish();
      }),
      ad.addAdEventListener(AdEventType.ERROR, (error: Error) => {
        this.rewardedLoaded = false;
        this.loadReason = availabilityReason(error);
        finish();
      }),
    );
    ad.load();
    return loadPromise;
  }

  async showInterstitial(_placement: AdPlacement): Promise<AdShowResult> {
    return { status: 'unavailable', reason: 'sdk_unavailable' };
  }

  async showRewarded(
    placement: AdPlacement,
    _reward: RewardedAdReward,
    requestId: string,
  ): Promise<AdShowResult> {
    const availability = await this.getAvailability('rewarded', placement);
    if (availability.status !== 'available' || !this.rewardedAd) {
      return {
        status: 'unavailable',
        reason:
          availability.status === 'available'
            ? 'not_loaded'
            : availability.reason,
      };
    }

    const ad = this.rewardedAd;
    this.rewardedLoaded = false;
    return new Promise(resolve => {
      let settled = false;
      let earnedReward = false;
      const settle = (result: AdShowResult) => {
        if (settled) return;
        settled = true;
        removeShowListeners.forEach(remove => remove());
        this.disposeRewardedAd();
        if (!this.closed) {
          this.preload('rewarded', placement).catch(() => undefined);
        }
        resolve(result);
      };
      const removeShowListeners = [
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earnedReward = true;
        }),
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          settle(
            earnedReward
              ? { status: 'rewarded', rewardEventId: `admob:${requestId}` }
              : { status: 'dismissed' },
          );
        }),
        ad.addAdEventListener(AdEventType.ERROR, (error: Error) => {
          settle(
            earnedReward
              ? { status: 'rewarded', rewardEventId: `admob:${requestId}` }
              : { status: 'failed', errorCode: errorCode(error) },
          );
        }),
      ];
      ad.show().catch(error => {
        settle({ status: 'failed', errorCode: errorCode(error) });
      });
    });
  }

  async isPrivacyOptionsRequired(): Promise<boolean> {
    try {
      const consent = await AdsConsent.getConsentInfo();
      return (
        consent.privacyOptionsRequirementStatus ===
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
      );
    } catch {
      return false;
    }
  }

  async showPrivacyOptions(): Promise<boolean> {
    try {
      const countryCode = await this.storeMarket.getStoreCountryCode();
      this.marketAllowsAds = isSupportedMarket(countryCode);
      if (!this.marketAllowsAds) return false;
      const consent = await AdsConsent.showPrivacyOptionsForm();
      this.consentAllowsAds = consent.canRequestAds;
      if (this.consentAllowsAds) {
        if (!this.initialized) {
          await mobileAds().initialize();
          this.initialized = true;
        }
        await this.preload('rewarded', 'home_credit_store');
      } else {
        this.disposeRewardedAd();
        this.loadReason = 'consent';
      }
      return true;
    } catch {
      return false;
    }
  }

  close(): void {
    this.closed = true;
    this.disposeRewardedAd();
  }

  private disposeRewardedAd(): void {
    this.unsubscribers.splice(0).forEach(remove => remove());
    this.rewardedAd?.removeAllListeners();
    this.rewardedAd = null;
    this.rewardedLoaded = false;
  }
}

export function createProductionAdGateway(): AdGateway {
  return new GoogleMobileAdsGateway({
    // Google test inventory is safe during development. A Release build stays
    // fail-closed until the real rewarded unit is supplied for launch.
    rewardedAdUnitId: __DEV__ ? TestIds.REWARDED : null,
  });
}
