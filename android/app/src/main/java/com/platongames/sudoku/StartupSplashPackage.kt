package com.platongames.sudoku

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class StartupSplashPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == StartupSplashModule.NAME) StartupSplashModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
        StartupSplashModule.NAME to
            ReactModuleInfo(
                StartupSplashModule.NAME,
                StartupSplashModule.NAME,
                false,
                false,
                false,
                false,
            ),
    )
  }
}
