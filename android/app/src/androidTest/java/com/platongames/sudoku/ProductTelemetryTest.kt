package com.platongames.sudoku

import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics
import org.junit.Assert.*
import org.junit.Test

/** Run only on the disposable test emulator with the test Firebase config. */
class ProductTelemetryTest {
  @Test fun consentAndEnvironment() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val probe = InstrumentationRegistry.getArguments().getString("telemetryProbe")
    if (probe == "network") {
      val appId = context.getString(context.resources.getIdentifier("google_app_id", "string", context.packageName))
      val connection = java.net.URL("https://firebase-settings.crashlytics.com/spi/v2/platforms/android/gmp/$appId/settings").openConnection() as javax.net.ssl.HttpsURLConnection
      connection.connectTimeout = 10000
      connection.readTimeout = 10000
      try { assertTrue(connection.responseCode in 100..599) }
      finally { connection.disconnect() }
      return
    }
    if (probe == "upload") {
      assertEquals("platon-sudoku-test", FirebaseApp.getInstance().options.projectId)
      // Startup sends only reports from the previously consented probe run.
      Thread.sleep(10000)
      return
    }
    val saved = context.getSharedPreferences("product_telemetry", 0)
    assertFalse(saved.getBoolean("analytics", false))
    assertFalse(saved.getBoolean("diagnostics", false))
    assertTrue(FirebaseApp.getApps(context).isEmpty())
    if (probe == "record") {
      assertTrue(ProductTelemetry.configure(context, true, true))
      assertEquals("platon-sudoku-test", FirebaseApp.getInstance().options.projectId)
      ProductTelemetry.log(context, "app_ready", "{\"build_environment\":\"development\",\"duration_bucket\":\"1_3s\"}")
      ProductTelemetry.error("controlled_diagnostic_probe", false, "[{\"line\":1,\"column\":1}]")
      // Bounded wait only in the explicitly selected cloud probe, never app code.
      Thread.sleep(10000)
      return
    }
    assertTrue(ProductTelemetry.configure(context, false, false))
    assertTrue(FirebaseApp.getApps(context).isEmpty())
    assertTrue(ProductTelemetry.configure(context, true, false))
    assertEquals("platon-sudoku-test", FirebaseApp.getInstance().options.projectId)
    assertTrue(saved.getBoolean("analytics", false))
    assertFalse(saved.getBoolean("diagnostics", false))
    assertFalse(FirebaseCrashlytics.getInstance().isCrashlyticsCollectionEnabled)
    ProductTelemetry.log(context, "app_ready", "{\"build_environment\":\"development\",\"duration_bucket\":\"1_3s\"}")
    assertTrue(ProductTelemetry.configure(context, false, true))
    assertFalse(saved.getBoolean("analytics", false))
    assertTrue(saved.getBoolean("diagnostics", false))
    assertFalse(FirebaseCrashlytics.getInstance().isCrashlyticsCollectionEnabled)
    assertTrue(ProductTelemetry.configure(context, false, false))
    assertFalse(saved.getBoolean("analytics", false))
    assertFalse(saved.getBoolean("diagnostics", false))
  }
}
