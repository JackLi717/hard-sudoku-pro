package com.platongames.sudoku

import android.view.SoundEffectConstants
import android.view.KeyEvent
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.platongames.sudoku.specs.NativeProductExperienceSpec

@ReactModule(name = ProductExperienceModule.NAME)
class ProductExperienceModule(private val reactContext: ReactApplicationContext) :
    NativeProductExperienceSpec(reactContext) {

  @Volatile private var hardwareInputEnabled = false

  override fun setHardwareInputEnabled(enabled: Boolean) {
    hardwareInputEnabled = enabled
  }

  fun handleHardwareKey(event: KeyEvent): Boolean {
    if (!hardwareInputEnabled || !event.isFromSource(android.view.InputDevice.SOURCE_KEYBOARD)) {
      return false
    }
    val accessibility = reactContext.getSystemService(android.content.Context.ACCESSIBILITY_SERVICE)
        as android.view.accessibility.AccessibilityManager
    if (accessibility.isTouchExplorationEnabled) return false
    // Remote direction keys belong to the native focus system, not board shortcuts.
    val device = event.device ?: return false
    if (device.keyboardType != android.view.InputDevice.KEYBOARD_TYPE_ALPHABETIC) return false
    val key = when (event.keyCode) {
      KeyEvent.KEYCODE_DPAD_UP -> "ArrowUp"
      KeyEvent.KEYCODE_DPAD_DOWN -> "ArrowDown"
      KeyEvent.KEYCODE_DPAD_LEFT -> "ArrowLeft"
      KeyEvent.KEYCODE_DPAD_RIGHT -> "ArrowRight"
      KeyEvent.KEYCODE_DEL -> "Backspace"
      KeyEvent.KEYCODE_FORWARD_DEL -> "Delete"
      in KeyEvent.KEYCODE_0..KeyEvent.KEYCODE_9 -> "${event.keyCode - KeyEvent.KEYCODE_0}"
      in KeyEvent.KEYCODE_NUMPAD_0..KeyEvent.KEYCODE_NUMPAD_9 -> "${event.keyCode - KeyEvent.KEYCODE_NUMPAD_0}"
      KeyEvent.KEYCODE_N -> "n"
      KeyEvent.KEYCODE_H -> "h"
      KeyEvent.KEYCODE_P -> "p"
      KeyEvent.KEYCODE_Z -> if (event.isCtrlPressed || event.isMetaPressed) "z" else return false
      else -> return false
    }
    if (event.isAltPressed || event.isShiftPressed) return false
    if ((event.isCtrlPressed || event.isMetaPressed) && key != "z") return false
    if (event.action == KeyEvent.ACTION_DOWN &&
        (event.repeatCount == 0 || key.startsWith("Arrow"))) {
      emitOnHardwareKey(Arguments.createMap().apply {
        putString("key", key)
        putBoolean("control", event.isCtrlPressed)
        putBoolean("meta", event.isMetaPressed)
        putBoolean("alt", event.isAltPressed)
        putBoolean("shift", event.isShiftPressed)
      })
    }
    return true
  }

  override fun invalidate() {
    hardwareInputEnabled = false
    super.invalidate()
  }

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
