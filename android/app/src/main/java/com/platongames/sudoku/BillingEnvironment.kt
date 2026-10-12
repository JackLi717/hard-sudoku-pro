package com.platongames.sudoku

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import org.json.JSONObject

/** Only the two Play components are inspected; no account, token or device identifier. */
internal object BillingEnvironment {
  fun collect(context: Context, productDetailsSupport: String = "unknown"): JSONObject =
      JSONObject()
          .put("productDetailsSupport", productDetailsSupport)
          .put("playStoreVersion", version(context, "com.android.vending"))
          .put("playServicesVersion", version(context, "com.google.android.gms"))
          .put("testEnvironment", try {
            if (Settings.System.getString(context.contentResolver, "firebase.test.lab") == "true")
                "test_lab" else "standard"
          } catch (_: Exception) { "unknown" })

  @Suppress("DEPRECATION")
  private fun version(context: Context, packageName: String): String = try {
    val info = context.packageManager.getPackageInfo(packageName, 0)
    (if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()).toString()
  } catch (_: PackageManager.NameNotFoundException) {
    "missing"
  } catch (_: Exception) {
    "unknown"
  }
}
