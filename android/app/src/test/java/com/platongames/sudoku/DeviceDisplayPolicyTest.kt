package com.platongames.sudoku

import android.content.pm.ActivityInfo
import org.junit.Assert.assertEquals
import org.junit.Test

class DeviceDisplayPolicyTest {
  @Test fun phonesTabletsAndFoldablesStayPortrait() {
    assertEquals(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT,
        DeviceDisplayPolicy.orientation(false, false))
  }

  @Test fun desktopWindowsRemainResizableEvenWhenNarrow() {
    assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED,
        DeviceDisplayPolicy.orientation(false, true))
  }

  @Test fun televisionStaysLandscape() {
    assertEquals(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE,
        DeviceDisplayPolicy.orientation(true, false))
  }

  @Test fun televisionPolicyTakesPrecedenceOverDesktopFeature() {
    assertEquals(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE,
        DeviceDisplayPolicy.orientation(true, true))
  }
}
