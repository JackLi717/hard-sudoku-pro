package com.platongames.sudoku

import android.app.Activity
import android.app.UiModeManager
import android.content.Context
import android.content.pm.ActivityInfo
import android.content.res.Configuration

/** Mobile devices stay portrait; television and desktop have their own policies. */
object DeviceDisplayPolicy {
  fun orientation(activity: Activity): Int {
    val mode = activity.getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
    val features = activity.packageManager
    return orientation(
        mode.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION,
        features.hasSystemFeature("android.hardware.type.pc") ||
            features.hasSystemFeature("org.chromium.arc") ||
            features.hasSystemFeature("com.google.android.play.feature.HPE_EXPERIENCE"),
    )
  }

  fun orientation(television: Boolean, desktop: Boolean): Int {
    if (television) return ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
    if (desktop) return ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    return ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
  }
}
