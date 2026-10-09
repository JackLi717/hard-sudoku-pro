package com.platongames.sudoku

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.modules.i18nmanager.I18nUtil

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(HintEnginePackage())
          add(StartupSplashPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // JS chooses direction per app language. Physical board coordinates must
    // never be swapped just because the device language is Arabic.
    I18nUtil.instance.swapLeftAndRightInRTL(this, false)
    configureAdPrivacy()
    ProductTelemetry.startup(this)
    loadReactNative(this)
  }

  @Suppress("DEPRECATION")
  private fun configureAdPrivacy() {
    // Apply Google's RDP signal before any Mobile Ads request. UMP still
    // gathers the applicable European consent and privacy choices.
    android.preference.PreferenceManager.getDefaultSharedPreferences(this)
      .edit()
      .putInt("gad_rdp", 1)
      .apply()
  }
}
