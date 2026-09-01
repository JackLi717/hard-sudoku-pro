package com.jackli717.sudoku

import android.view.SoundEffectConstants
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.jackli717.sudoku.specs.NativeProductExperienceSpec

@ReactModule(name = ProductExperienceModule.NAME)
class ProductExperienceModule(private val reactContext: ReactApplicationContext) :
    NativeProductExperienceSpec(reactContext) {

  override fun setKeepAwake(enabled: Boolean) {
    reactContext.runOnUiQueueThread {
      reactContext.currentActivity?.window?.let { window ->
        if (enabled) {
          window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
          window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
      }
    }
  }

  override fun playClick() {
    reactContext.runOnUiQueueThread {
      reactContext.currentActivity?.window?.decorView?.playSoundEffect(
          SoundEffectConstants.CLICK,
      )
    }
  }

  companion object {
    const val NAME = NativeProductExperienceSpec.NAME
  }
}
