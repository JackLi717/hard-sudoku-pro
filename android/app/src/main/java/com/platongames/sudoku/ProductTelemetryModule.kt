package com.platongames.sudoku

import android.content.Context
import android.os.Bundle
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.google.firebase.FirebaseApp
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.google.firebase.crashlytics.CustomKeysAndValues
import com.platongames.sudoku.specs.NativeProductTelemetrySpec
import org.json.JSONObject

/** No automatic Firebase provider; persisted collection settings are checked before SDK startup. */
object ProductTelemetry {
  private var analyticsAllowed = false
  private var diagnosticsAllowed = false
  private var initialized = false

  @Synchronized
  fun startup(context: Context) {
    val saved = context.getSharedPreferences("product_telemetry", Context.MODE_PRIVATE)
    configure(context, saved.getBoolean("analytics", false), saved.getBoolean("diagnostics", false), true)
  }

  @Synchronized
  fun configure(context: Context, analytics: Boolean, diagnostics: Boolean, startup: Boolean = false): Boolean {
    val previousDiagnostics = diagnosticsAllowed
    analyticsAllowed = analytics
    diagnosticsAllowed = diagnostics
    context.getSharedPreferences("product_telemetry", Context.MODE_PRIVATE).edit()
      .putBoolean("analytics", analytics).putBoolean("diagnostics", diagnostics).apply()
    if (!initialized && !analytics && !diagnostics) return true
    return try {
      if (!initialized) {
        if (FirebaseApp.initializeApp(context) == null) return false
        initialized = true
      }
      val measurement = FirebaseAnalytics.getInstance(context)
      measurement.setConsent(mapOf(
        FirebaseAnalytics.ConsentType.ANALYTICS_STORAGE to if (analytics) FirebaseAnalytics.ConsentStatus.GRANTED else FirebaseAnalytics.ConsentStatus.DENIED,
        FirebaseAnalytics.ConsentType.AD_STORAGE to FirebaseAnalytics.ConsentStatus.DENIED,
        FirebaseAnalytics.ConsentType.AD_USER_DATA to FirebaseAnalytics.ConsentStatus.DENIED,
        FirebaseAnalytics.ConsentType.AD_PERSONALIZATION to FirebaseAnalytics.ConsentStatus.DENIED,
      ))
      measurement.setUserProperty("allow_personalized_ads", "false")
      measurement.setAnalyticsCollectionEnabled(analytics)
      if (!analytics) measurement.resetAnalyticsData()
      // Keep automatic upload off. Only reports from a previously enabled
      // run are sent, so enabling never uploads an earlier disabled-run crash.
      val crashlytics = FirebaseCrashlytics.getInstance()
      crashlytics.setCrashlyticsCollectionEnabled(false)
      if (startup && diagnostics) crashlytics.sendUnsentReports()
      else if (!diagnostics || !previousDiagnostics) crashlytics.deleteUnsentReports()
      true
    } catch (_: Exception) { false }
  }

  @Synchronized
  fun log(context: Context, name: String, json: String) {
    if (!initialized || !analyticsAllowed || !name.matches(Regex("[a-z_]{1,40}"))) return
    try {
      val parameters = Bundle()
      val source = JSONObject(json)
      for (key in source.keys()) {
        when (val value = source.get(key)) {
          is String -> parameters.putString(key, value)
          is Number -> parameters.putDouble(key, value.toDouble())
        }
      }
      FirebaseAnalytics.getInstance(context).logEvent(name, parameters)
    } catch (_: Exception) { }
  }

  @Synchronized
  fun error(operation: String, fatal: Boolean, frames: String, details: String = "{}") {
    if (!initialized || !diagnosticsAllowed || !operation.matches(Regex("[a-z_]{1,48}"))) return
    val error = IllegalStateException("Sudoku operation: $operation")
    // Error text and JS locals are deliberately excluded. Numeric bundle
    // locations are sufficient for offline source-map symbolication.
    try {
      val parsed = org.json.JSONArray(frames)
      error.stackTrace = (0 until minOf(parsed.length(), 32)).map { index ->
        val frame = parsed.getJSONObject(index)
        StackTraceElement("JavaScript", "bundle_column_${frame.optInt("column", 0)}", "index.android.bundle", frame.optInt("line", 0))
      }.toTypedArray()
    } catch (_: Exception) { error.stackTrace = emptyArray() }
    // Event-specific keys avoid leaking a previous operation's context into another report.
    val keys = CustomKeysAndValues.Builder().putBoolean("javascript_fatal", fatal)
    for ((key, value) in ProductDiagnosticDetails.sanitize(details)) {
      when (value) {
        is String -> keys.putString(key, value)
        is Int -> keys.putInt(key, value)
      }
    }
    FirebaseCrashlytics.getInstance().recordException(error, keys.build())
  }
}

@ReactModule(name = ProductTelemetryModule.NAME)
class ProductTelemetryModule(private val context: ReactApplicationContext) : NativeProductTelemetrySpec(context) {
  override fun configure(analytics: Boolean, diagnostics: Boolean, promise: Promise) {
    promise.resolve(ProductTelemetry.configure(context, analytics, diagnostics))
  }
  override fun logEvent(name: String, parametersJson: String) { ProductTelemetry.log(context, name, parametersJson) }
  override fun recordError(operation: String, fatal: Boolean, framesJson: String, detailsJson: String) { ProductTelemetry.error(operation, fatal, framesJson, detailsJson) }
  companion object { const val NAME = NativeProductTelemetrySpec.NAME }
}
