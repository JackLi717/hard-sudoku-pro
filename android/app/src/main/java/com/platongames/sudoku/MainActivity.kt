package com.platongames.sudoku

import android.content.res.Configuration
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  private var startupSplash: View? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    requestedOrientation = DeviceDisplayPolicy.orientation(this)
    super.onCreate(savedInstanceState)
    showStartupSplash()
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    val orientation = DeviceDisplayPolicy.orientation(this)
    if (requestedOrientation != orientation) requestedOrientation = orientation
  }

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    val input = if (hasWindowFocus()) {
      reactHost?.currentReactContext?.getNativeModule(ProductExperienceModule::class.java)
    } else null
    if (input?.handleHardwareKey(event) == true) return true
    return super.dispatchKeyEvent(event)
  }

  fun hideStartupSplash() {
    val splash = startupSplash ?: return
    startupSplash = null
    (splash.parent as? ViewGroup)?.removeView(splash)
  }

  private fun showStartupSplash() {
    val content = findViewById<ViewGroup>(android.R.id.content)
    val splash = FrameLayout(this).apply {
      setBackgroundResource(R.drawable.launch_screen)
    }
    val lockup = LinearLayout(this).apply {
      gravity = Gravity.CENTER_HORIZONTAL
      orientation = LinearLayout.VERTICAL
      translationY = (-48).dp.toFloat()
    }
    lockup.addView(
        ImageView(this).apply {
          contentDescription = getString(R.string.app_name)
          scaleType = ImageView.ScaleType.FIT_XY
          setImageResource(R.drawable.launch_icon)
        },
        LinearLayout.LayoutParams(132.dp, 132.dp),
    )
    lockup.addView(
        TextView(this).apply {
          setTextColor(Color.rgb(247, 241, 230))
          setTextSize(30f)
          typeface = android.graphics.Typeface.create("serif", android.graphics.Typeface.NORMAL)
          letterSpacing = 0.04f
          setShadowLayer(4f, 0f, 2f, Color.BLACK)
          text = "Platon Games"
        },
        LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            )
            .apply { topMargin = 18.dp },
    )
    splash.addView(
        lockup,
        FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER,
            ),
    )
    content.addView(
        splash,
        ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
        ),
    )
    startupSplash = splash
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "HardSudokuPro"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  private val Int.dp: Int
    get() = (this * resources.displayMetrics.density).toInt()
}
