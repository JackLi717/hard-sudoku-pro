import NativeProductTelemetry from '../../native/NativeProductTelemetry';
import type { AnalyticsGateway } from '../../application/analytics/contracts';
import {
  isAnalyticsEvent,
  sanitizeParameters,
} from '../../application/analytics/contracts';

export const nativeAnalyticsGateway: AnalyticsGateway = {
  async configure(analytics, diagnostics) {
    if (!NativeProductTelemetry) return false;
    return NativeProductTelemetry.configure(analytics, diagnostics);
  },
  logEvent(name, parameters) {
    if (!isAnalyticsEvent(name)) return;
    NativeProductTelemetry?.logEvent(
      name,
      JSON.stringify(sanitizeParameters(parameters)),
    );
  },
  recordError(operation, fatal, frames) {
    NativeProductTelemetry?.recordError(operation, fatal, frames);
  },
};
