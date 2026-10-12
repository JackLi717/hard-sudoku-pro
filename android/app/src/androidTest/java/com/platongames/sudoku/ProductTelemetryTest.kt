package com.platongames.sudoku

import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Run only on the disposable test emulator with the test Firebase config. */
class ProductTelemetryTest {
  @Test fun consentAndEnvironment() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val probe = InstrumentationRegistry.getArguments().getString("telemetryProbe")
    if (probe == "billing_record") {
      assertTrue("Cloud probe must use the Debug/test build", BuildConfig.DEBUG)
      assertTrue(ProductTelemetry.configure(context, true, true))
      assertEquals("platon-sudoku-test", FirebaseApp.getInstance().options.projectId)
      // Replay the real TS controller/native-gateway/analytics regression output.
      // The store response in that regression is a fixture, never a fresh Play order.
      val encoded = requireNotNull(InstrumentationRegistry.getArguments().getString("billingEvents"))
      val events = org.json.JSONArray(String(android.util.Base64.decode(encoded, android.util.Base64.DEFAULT), Charsets.UTF_8))
      var acquisitions = 0
      var purchases = 0
      var restores = 0
      val names = setOf("entitlement_changed", "purchase_started", "purchase_result", "restore_result", "product_load_result")
      for (index in 0 until events.length()) {
        val event = events.getJSONObject(index)
        val name = event.getString("name")
        if (name !in names) continue
        val parameters = event.getJSONObject("parameters")
        assertEquals("development", parameters.getString("build_environment"))
        assertFalse(parameters.toString().contains("secret-token"))
        assertFalse(parameters.toString().contains("private-transaction"))
        if (name == "entitlement_changed" && parameters.optInt("new_acquisition") == 1) acquisitions++
        if (name == "purchase_result" && parameters.optString("result") == "purchased") purchases++
        if (name == "restore_result" && parameters.optString("result") == "restored") restores++
        ProductTelemetry.log(context, name, parameters.toString())
      }
      assertEquals(1, acquisitions)
      assertEquals(1, purchases)
      assertEquals(1, restores)
      // Controlled unsupported failure, with the actual device's component versions.
      val environment = BillingEnvironment.collect(context, "unsupported")
      val details = JSONObject()
          .put("build_environment", "development").put("product", "lifetime_premium")
          .put("entry", "startup").put("stage", "check_feature")
          .put("reason", "feature_unsupported").put("error_code", "billing_-2")
          .put("billing_response", "-2").put("attempts", 1)
          .put("product_details_support", environment.getString("productDetailsSupport"))
          .put("play_store_version", environment.getString("playStoreVersion"))
          .put("play_services_version", environment.getString("playServicesVersion"))
          .put("test_environment", environment.getString("testEnvironment"))
      ProductTelemetry.error("product_load", false, "[{\"line\":1,\"column\":1}]", details.toString())
      ProductTelemetry.log(context, "product_load_result", details.put("result", "failed").toString())
      Thread.sleep(15000)
      return
    }
    if (probe == "funnel") {
      assertTrue("Cloud probe must use the Debug/test build", BuildConfig.DEBUG)
      assertTrue(ProductTelemetry.configure(context, true, false))
      assertEquals("platon-sudoku-test", FirebaseApp.getInstance().options.projectId)
      // Replay the actual TS game-engine/observer/native-gateway contract test
      // output, never hand-authored production events or a production config.
      val encoded = requireNotNull(InstrumentationRegistry.getArguments().getString("funnelEvents"))
      val events = org.json.JSONArray(String(android.util.Base64.decode(encoded, android.util.Base64.DEFAULT), Charsets.UTF_8))
      val funnel = mutableListOf<String>()
      val steps = setOf("game_started", "game_first_action", "first_game_engaged", "first_game_completed")
      for (index in 0 until events.length()) {
        val event = events.getJSONObject(index)
        val name = event.getString("name")
        val parameters = event.getJSONObject("parameters")
        assertEquals("development", parameters.getString("build_environment"))
        if (name in steps) {
          assertEquals("level_3", parameters.getString("difficulty"))
          assertEquals("yes", parameters.getString("first_game"))
          assertEquals("new", parameters.getString("observation"))
          funnel.add(name)
        }
        if (parameters.has("elapsed_ms")) assertTrue(parameters.get("elapsed_ms") is Number)
        ProductTelemetry.log(context, name, parameters.toString())
      }
      assertEquals(listOf("game_started", "game_first_action", "first_game_engaged", "first_game_completed"), funnel)
      Thread.sleep(15000)
      return
    }
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
