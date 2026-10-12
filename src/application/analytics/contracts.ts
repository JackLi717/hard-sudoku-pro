export const ANALYTICS_EVENTS = [
  'app_ready',
  'app_active_day',
  'screen_view',
  'game_started',
  'game_resumed',
  'game_first_action',
  'game_engaged',
  'first_game_engaged',
  'first_game_completed',
  'game_ended',
  'game_activity_summary',
  'hint_requested',
  'hint_result',
  'hint_interaction',
  'quick_pencil_result',
  'reward_granted',
  'credit_blocked',
  'rewarded_ad_offer_view',
  'rewarded_ad_attempt',
  'rewarded_ad_result',
  'premium_view',
  'product_load_result',
  'purchase_started',
  'purchase_result',
  'restore_result',
  'entitlement_changed',
  'replay_opened',
  'replay_summary',
  'lesson_opened',
  'lesson_completed',
  'lesson_interaction',
  'practice_started',
  'practice_ended',
  'share_action',
  'support_action',
  'preference_changed',
  'operation_failed',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export const isAnalyticsEvent = (name: string): name is AnalyticsEvent =>
  (ANALYTICS_EVENTS as readonly string[]).includes(name);
export type AnalyticsParameters = Readonly<Record<string, string | number>>;
export interface AnalyticsGateway {
  configure(analytics: boolean, diagnostics: boolean): Promise<boolean>;
  logEvent(name: AnalyticsEvent, parameters: AnalyticsParameters): void;
  recordError(
    operation: string,
    fatal: boolean,
    frames: string,
    details?: AnalyticsParameters,
  ): void;
}
export interface AnalyticsStore {
  getSetting<Value>(key: string): Promise<Value | null>;
  setSetting<Value>(key: string, value: Value, now: number): Promise<void>;
}
export interface AnalyticsReporter {
  track(name: AnalyticsEvent, parameters?: AnalyticsParameters): void;
  setContext?(context: AnalyticsParameters): void;
  screenView?(name: string): void;
  failure(
    operation: string,
    fatal?: boolean,
    frames?: string,
    details?: AnalyticsParameters,
  ): void;
}
export const NOOP_ANALYTICS: AnalyticsReporter = {
  track() {},
  failure() {},
};

const PARAMETER_KEYS = new Set([
  'build_environment',
  'app_language',
  'device_class',
  'entitlement',
  'entitlement_source',
  'access_reason',
  'screen_name',
  'screen_class',
  'entry',
  'difficulty',
  'puzzle_kind',
  'first_game',
  'result',
  'reason',
  'action',
  'technique',
  'reward_source',
  'balance_bucket',
  'duration_bucket',
  'wait_bucket',
  'install_age',
  'observation',
  'cycle_day',
  'requested',
  'credited',
  'truncated',
  'restarted',
  'hints',
  'quick_pencils',
  'mistakes',
  'actions',
  'undos',
  'elapsed_ms',
  'span_bucket',
  'auto_finish',
  'stage',
  'product',
  'new_acquisition',
  'operation',
  'previous_entitlement',
  'lesson',
  'attempts',
  'explanation',
  'steps_bucket',
  'preference',
  'value',
  'error_code',
  'billing_response',
  'unfetched_status',
  'product_details_support',
  'play_store_version',
  'play_services_version',
  'test_environment',
]);

/** Deliberately excludes identifiers, boards, free text, URLs and credentials. */
export function sanitizeParameters(
  input: AnalyticsParameters,
): Record<string, string | number> {
  const output: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!PARAMETER_KEYS.has(key) || Object.keys(output).length >= 25) continue;
    if (key === 'product_details_support' || key === 'test_environment') {
      const categories =
        key === 'product_details_support'
          ? ['supported', 'unsupported', 'unknown']
          : ['test_lab', 'standard', 'unknown'];
      if (typeof value === 'string' && categories.includes(value))
        output[key] = value;
      continue;
    }
    if (key === 'play_store_version' || key === 'play_services_version') {
      if (
        typeof value === 'string' &&
        /^(?:[0-9]{1,19}|missing|unknown)$/.test(value)
      )
        output[key] = value;
      continue;
    }
    // App event dimensions must be textual categories: GA4 does not parse
    // integer app parameters as event-scoped custom dimensions.
    if (key === 'difficulty') {
      if (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 5
      )
        output[key] = `level_${value}`;
      else if (typeof value === 'string' && /^level_[1-5]$/.test(value))
        output[key] = value;
      continue;
    }
    if (key === 'first_game') {
      if (value === 1 || value === 'yes') output[key] = 'yes';
      if (value === 0 || value === 'no') output[key] = 'no';
      continue;
    }
    if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 1e12
    ) {
      output[key] = value;
    } else if (
      typeof value === 'string' &&
      /^[a-zA-Z0-9_.-]{1,64}$/.test(value)
    ) {
      output[key] = value;
    }
  }
  return output;
}

export function durationBucket(ms: number): string {
  if (ms < 100) return 'lt_100ms';
  if (ms < 300) return '100_299ms';
  if (ms < 1000) return '300_999ms';
  if (ms < 3000) return '1_3s';
  if (ms < 10000) return '3_10s';
  if (ms < 60000) return '10_60s';
  if (ms < 300000) return '1_5m';
  if (ms < 900000) return '5_15m';
  if (ms < 1800000) return '15_30m';
  if (ms < 3600000) return '30_60m';
  if (ms < 7200000) return '60_120m';
  return 'gte_120m';
}
export function balanceBucket(value: number): string {
  if (value === 0) return '0';
  if (value <= 2) return '1_2';
  if (value <= 5) return '3_5';
  if (value <= 10) return '6_10';
  if (value <= 30) return '11_30';
  if (value <= 94) return '31_94';
  return '95_99';
}

let activeReporter: AnalyticsReporter = NOOP_ANALYTICS;
/** Application boundary; screens and domain adapters never import Firebase. */
export const productAnalytics = {
  setContext(context: AnalyticsParameters) {
    activeReporter.setContext?.(context);
  },
  screenView(name: string) {
    activeReporter.screenView?.(name);
  },
  track(name: AnalyticsEvent, parameters?: AnalyticsParameters) {
    activeReporter.track(name, parameters);
  },
  failure(
    operation: string,
    fatal?: boolean,
    frames?: string,
    details?: AnalyticsParameters,
  ) {
    activeReporter.failure(operation, fatal, frames, details);
  },
};
export function activateAnalytics(reporter: AnalyticsReporter): () => void {
  activeReporter = reporter;
  return () => {
    if (activeReporter === reporter) activeReporter = NOOP_ANALYTICS;
  };
}
