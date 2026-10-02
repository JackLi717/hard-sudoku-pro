package com.platongames.sudoku

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = StartupSplashModule.NAME)
class StartupSplashModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  override fun getConstants(): MutableMap<String, Any> =
      mutableMapOf("closedBetaSmartHintFloor" to BuildConfig.CLOSED_BETA_SMART_HINT_FLOOR)

  @ReactMethod
  fun hide() {
    val activity = reactApplicationContext.currentActivity
    activity?.runOnUiThread {
      (activity as? MainActivity)?.hideStartupSplash()
    }
  }

  companion object {
    const val NAME = "StartupSplash"
  }
}
