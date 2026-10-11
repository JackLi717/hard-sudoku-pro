jest.mock('react-native-google-mobile-ads', () => {
  const consent = {
    canRequestAds: true,
    privacyOptionsRequirementStatus: 'required',
  };
  const created: any[] = [];
  const initialize = jest.fn(async () => []);
  const create = jest.fn(() => {
    const listeners = new Map<string, () => void>();
    const ad = {
      load: jest.fn(),
      show: jest.fn(async () => undefined),
      removeAllListeners: jest.fn(() => listeners.clear()),
      addAdEventListener: jest.fn((event: string, listener: () => void) => {
        listeners.set(event, listener);
      }),
      emit: (event: string) => listeners.get(event)?.(),
    };
    created.push(ad);
    return ad;
  });
  return {
    __esModule: true,
    default: () => ({ initialize }),
    AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
    AdsConsent: {
      gatherConsent: jest.fn(async () => consent),
      getConsentInfo: jest.fn(async () => consent),
      showPrivacyOptionsForm: jest.fn(async () => consent),
    },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'required' },
    InterstitialAd: { createForAdRequest: create },
    TestIds: { INTERSTITIAL: 'google-test-interstitial' },
    __test: { consent, created, initialize, create },
  };
});
jest.mock('../src/native/NativeAdMarket', () => ({
  __esModule: true,
  default: { getStoreCountryCode: jest.fn(async () => 'AU') },
}));

import { Platform } from 'react-native';
import { AdsConsent } from 'react-native-google-mobile-ads';
import {
  createClosedBetaTestAdGateway,
  GoogleTestAdGateway,
} from '../src/infrastructure/ads';

const sdk = jest.requireMock('react-native-google-mobile-ads').__test;
const drain = async () => {
  for (let n = 0; n < 8; n++) await Promise.resolve();
};

beforeEach(() => {
  jest.clearAllMocks();
  sdk.created.splice(0);
  sdk.consent.canRequestAds = true;
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

test('creates a lazy test preview only for opted-in Android closed tests, excluding TV', () => {
  const originalOS = Platform.OS;
  const isTV = jest.spyOn(Platform, 'isTV', 'get').mockReturnValue(false);
  try {
    Platform.OS = 'android';
    expect(createClosedBetaTestAdGateway(false)).toBeUndefined();
    const gateway = createClosedBetaTestAdGateway(true);
    expect(gateway).toBeInstanceOf(GoogleTestAdGateway);
    expect(sdk.initialize).not.toHaveBeenCalled();
    expect(sdk.create).not.toHaveBeenCalled();
    gateway?.close();
    Platform.OS = 'ios';
    expect(createClosedBetaTestAdGateway(true)).toBeUndefined();
    Platform.OS = 'android';
    isTV.mockReturnValue(true);
    expect(createClosedBetaTestAdGateway(true)).toBeUndefined();
  } finally {
    Platform.OS = originalOS;
    isTV.mockRestore();
  }
});

test('loads only Google demo inventory and completes without any reward contract', async () => {
  const gateway = new GoogleTestAdGateway();
  const result = gateway.show();
  await drain();
  expect(sdk.create).toHaveBeenCalledWith('google-test-interstitial', {
    requestNonPersonalizedAdsOnly: true,
  });
  const ad = sdk.created[0];
  expect(ad.show).not.toHaveBeenCalled();
  ad.emit('loaded');
  ad.emit('loaded');
  await drain();
  expect(ad.show).toHaveBeenCalledTimes(1);
  ad.emit('closed');
  expect(await result).toEqual({ status: 'completed' });
  expect(ad.removeAllListeners).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
  gateway.close();
});

test.each([null, 'CN', 'CHN'])(
  'rejects unsupported market %s before consent or SDK startup',
  async country => {
    const gateway = new GoogleTestAdGateway({
      getStoreCountryCode: async () => country,
    });
    expect(await gateway.show()).toEqual({
      status: 'unavailable',
      reason: 'market',
    });
    expect(AdsConsent.gatherConsent).not.toHaveBeenCalled();
    expect(sdk.initialize).not.toHaveBeenCalled();
    expect(sdk.create).not.toHaveBeenCalled();
    gateway.close();
  },
);

test('consent denial makes no ad request and keeps privacy choices available', async () => {
  sdk.consent.canRequestAds = false;
  const gateway = new GoogleTestAdGateway();
  expect(await gateway.show()).toEqual({
    status: 'unavailable',
    reason: 'consent',
  });
  expect(sdk.create).not.toHaveBeenCalled();
  expect(await gateway.isPrivacyOptionsRequired()).toBe(true);
  expect(await gateway.showPrivacyOptions()).toBe(true);
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  gateway.close();
});

test('load error cleans up and a later attempt can load again', async () => {
  const gateway = new GoogleTestAdGateway();
  const first = gateway.show();
  await drain();
  sdk.created[0].emit('error');
  expect(await first).toMatchObject({ status: 'failed' });
  const second = gateway.show();
  await drain();
  sdk.created[1].emit('loaded');
  await drain();
  sdk.created[1].emit('closed');
  expect(await second).toEqual({ status: 'completed' });
  expect(sdk.initialize).toHaveBeenCalledTimes(1);
  gateway.close();
});

test('a stalled load times out and releases the single-playback lock', async () => {
  const gateway = new GoogleTestAdGateway();
  const first = gateway.show();
  await drain();
  expect(await gateway.show()).toEqual({
    status: 'unavailable',
    reason: 'operation_in_progress',
  });
  jest.advanceTimersByTime(30_000);
  expect(await first).toEqual({ status: 'unavailable', reason: 'not_loaded' });
  expect(sdk.created[0].removeAllListeners).toHaveBeenCalled();
  gateway.close();
});

test('closing during load prevents a queued show and resolves the pending caller', async () => {
  const gateway = new GoogleTestAdGateway();
  const result = gateway.show();
  await drain();
  const ad = sdk.created[0];
  ad.emit('loaded');
  gateway.close();
  await drain();
  expect(await result).toEqual({
    status: 'unavailable',
    reason: 'sdk_unavailable',
  });
  expect(ad.show).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test('show rejection clears listeners and returns a recoverable failure', async () => {
  const gateway = new GoogleTestAdGateway();
  const result = gateway.show();
  await drain();
  sdk.created[0].show.mockRejectedValueOnce(new Error('offline'));
  sdk.created[0].emit('loaded');
  await drain();
  expect(await result).toEqual({ status: 'failed', errorCode: 'show_failed' });
  expect(sdk.created[0].removeAllListeners).toHaveBeenCalledTimes(1);
  gateway.close();
});
