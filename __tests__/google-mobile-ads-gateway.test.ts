jest.mock('react-native-google-mobile-ads', () => {
  const consent = {
    canRequestAds: true,
    privacyOptionsRequirementStatus: 'not_required',
  };
  const createdAds: Array<{
    listeners: Map<string, Set<(value?: unknown) => void>>;
    load: jest.Mock;
    show: jest.Mock;
    removeAllListeners: jest.Mock;
    addAdEventListener(
      type: string,
      listener: (value?: unknown) => void,
    ): () => boolean;
    emit(type: string, value?: unknown): void;
  }> = [];
  class RewardedAdDouble {
    listeners = new Map<string, Set<(value?: unknown) => void>>();
    load = jest.fn();
    show = jest.fn(async () => undefined);
    removeAllListeners = jest.fn(() => this.listeners.clear());

    addAdEventListener(type: string, listener: (value?: unknown) => void) {
      const listeners = this.listeners.get(type) ?? new Set();
      listeners.add(listener);
      this.listeners.set(type, listeners);
      return () => listeners.delete(listener);
    }

    emit(type: string, value?: unknown) {
      [...(this.listeners.get(type) ?? [])].forEach(listener =>
        listener(value),
      );
    }
  }
  const createForAdRequest = jest.fn(() => {
    const ad = new RewardedAdDouble();
    createdAds.push(ad);
    return ad;
  });
  const gatherConsent = jest.fn(async () => consent);
  const getConsentInfo = jest.fn(async () => consent);
  const showPrivacyOptionsForm = jest.fn(async () => consent);
  const initializeAds = jest.fn(async () => []);
  return {
    __esModule: true,
    default: () => ({ initialize: initializeAds }),
    AdEventType: { CLOSED: 'closed', ERROR: 'error' },
    AdsConsent: {
      gatherConsent,
      getConsentInfo,
      showPrivacyOptionsForm,
    },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'required' },
    RewardedAd: { createForAdRequest },
    RewardedAdEventType: {
      LOADED: 'loaded',
      EARNED_REWARD: 'earned_reward',
    },
    TestIds: { REWARDED: 'test-rewarded' },
    __test: {
      consent,
      createdAds,
      createForAdRequest,
      gatherConsent,
      initializeAds,
    },
  };
});

import { GoogleMobileAdsGateway } from '../src/infrastructure/ads';

const adsTestDouble = jest.requireMock('react-native-google-mobile-ads').__test;

describe('GoogleMobileAdsGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adsTestDouble.createdAds.splice(0);
    adsTestDouble.consent.canRequestAds = true;
    adsTestDouble.consent.privacyOptionsRequirementStatus = 'not_required';
  });

  test.each([['CN'], ['CHN'], [null]])(
    'fails closed before UMP or ads initialization for market %p',
    async countryCode => {
      const gateway = new GoogleMobileAdsGateway({
        rewardedAdUnitId: 'rewarded-unit',
        storeMarket: { getStoreCountryCode: async () => countryCode },
      });

      await gateway.initialize();

      expect(adsTestDouble.gatherConsent).not.toHaveBeenCalled();
      expect(adsTestDouble.initializeAds).not.toHaveBeenCalled();
      expect(
        await gateway.getAvailability('rewarded', 'home_credit_store'),
      ).toEqual({ status: 'unavailable', reason: 'market' });
    },
  );

  test('does not request an ad when UMP does not allow it', async () => {
    adsTestDouble.consent.canRequestAds = false;
    const gateway = new GoogleMobileAdsGateway({
      rewardedAdUnitId: 'rewarded-unit',
      storeMarket: { getStoreCountryCode: async () => 'AU' },
    });

    await gateway.initialize();

    expect(adsTestDouble.gatherConsent).toHaveBeenCalledTimes(1);
    expect(adsTestDouble.initializeAds).not.toHaveBeenCalled();
    expect(adsTestDouble.createForAdRequest).not.toHaveBeenCalled();
    expect(
      await gateway.getAvailability('rewarded', 'credit_exhausted'),
    ).toEqual({ status: 'unavailable', reason: 'consent' });
  });

  test('uses non-personalized inventory and rewards only after the earned event', async () => {
    const gateway = new GoogleMobileAdsGateway({
      rewardedAdUnitId: 'rewarded-unit',
      storeMarket: { getStoreCountryCode: async () => 'AUS' },
    });
    await gateway.initialize();
    const ad = adsTestDouble.createdAds[0];
    expect(adsTestDouble.createForAdRequest).toHaveBeenCalledWith(
      'rewarded-unit',
      { requestNonPersonalizedAdsOnly: true },
    );
    ad.emit('loaded');
    expect(
      await gateway.getAvailability('rewarded', 'home_credit_store'),
    ).toEqual({ status: 'available' });

    const result = gateway.showRewarded(
      'home_credit_store',
      { resource: 'smart_hint', amount: 1 },
      'request-7',
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(ad.show).toHaveBeenCalledTimes(1);
    ad.emit('earned_reward', { amount: 100, type: 'ignored-by-wallet' });
    ad.emit('earned_reward', { amount: 100, type: 'duplicate' });
    ad.emit('closed');

    await expect(result).resolves.toEqual({
      status: 'rewarded',
      rewardEventId: 'admob:request-7',
    });
  });

  test('closing without an earned event dismisses without a reward', async () => {
    const gateway = new GoogleMobileAdsGateway({
      rewardedAdUnitId: 'rewarded-unit',
      storeMarket: { getStoreCountryCode: async () => 'AU' },
    });
    await gateway.initialize();
    const ad = adsTestDouble.createdAds[0];
    ad.emit('loaded');

    const result = gateway.showRewarded(
      'credit_exhausted',
      { resource: 'quick_pencil', amount: 1 },
      'request-8',
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(ad.show).toHaveBeenCalledTimes(1);
    ad.emit('closed');

    await expect(result).resolves.toEqual({ status: 'dismissed' });
  });

  test('keeps a valid earned reward if a later SDK error replaces close', async () => {
    const gateway = new GoogleMobileAdsGateway({
      rewardedAdUnitId: 'rewarded-unit',
      storeMarket: { getStoreCountryCode: async () => 'AU' },
    });
    await gateway.initialize();
    const ad = adsTestDouble.createdAds[0];
    ad.emit('loaded');

    const result = gateway.showRewarded(
      'home_credit_store',
      { resource: 'smart_hint', amount: 1 },
      'request-9',
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    ad.emit('earned_reward');
    ad.emit('error', { code: 'googleMobileAds/internal-error' });

    await expect(result).resolves.toEqual({
      status: 'rewarded',
      rewardEventId: 'admob:request-9',
    });
  });

  test('normalizes no-fill and offline failures without exposing an ad', async () => {
    const gateway = new GoogleMobileAdsGateway({
      rewardedAdUnitId: 'rewarded-unit',
      storeMarket: { getStoreCountryCode: async () => 'AU' },
    });
    await gateway.initialize();
    adsTestDouble.createdAds[0].emit('error', {
      code: 'googleMobileAds/no-fill',
    });
    expect(
      await gateway.getAvailability('rewarded', 'home_credit_store'),
    ).toEqual({ status: 'unavailable', reason: 'not_loaded' });

    adsTestDouble.createdAds[1].emit('error', {
      code: 'googleMobileAds/network-error',
    });
    expect(
      await gateway.getAvailability('rewarded', 'home_credit_store'),
    ).toEqual({ status: 'unavailable', reason: 'offline' });
  });

  test('keeps every non-rewarded format and automatic placement unreachable', async () => {
    const gateway = new GoogleMobileAdsGateway({
      rewardedAdUnitId: 'rewarded-unit',
      storeMarket: { getStoreCountryCode: async () => 'AU' },
    });
    await gateway.initialize();

    await expect(
      gateway.getAvailability('interstitial', 'home_credit_store'),
    ).resolves.toEqual({ status: 'unavailable', reason: 'sdk_unavailable' });
    await expect(
      gateway.getAvailability('rewarded', 'game_completion'),
    ).resolves.toEqual({ status: 'unavailable', reason: 'sdk_unavailable' });
  });
});
