package com.platongames.sudoku

import android.database.sqlite.SQLiteDatabase
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test

/** Explicitly opted-in local cache reset for the dedicated emulator's real Play restore test. */
class PremiumCacheTest {
  @Test fun resetOnlyLocalPremiumCacheForRestoreAcceptance() {
    val arguments = InstrumentationRegistry.getArguments()
    val reset = arguments.getString("resetPremiumCache") == "true"
    val remove = arguments.getString("removePremiumCache") == "true"
    val verify = arguments.getString("verifyPremiumCache") == "true"
    if (!reset && !remove && !verify) return
    assertEquals("Select exactly one cache probe", 1, listOf(reset, remove, verify).count { it })
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val file = context.filesDir.resolve("databases/user.sqlite")
    assertTrue("The acceptance app must have initialized its user database", file.exists())
    SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use { database ->
      if (remove) database.execSQL("DELETE FROM purchase_entitlements WHERE product_id = 'premium'")
      if (reset) database.execSQL("UPDATE purchase_entitlements SET active = 0 WHERE product_id = 'premium'")
      database.rawQuery("SELECT active FROM purchase_entitlements WHERE product_id = 'premium'", null).use { cursor ->
        if (remove) {
          assertEquals("Premium ownership cache must be absent, not just inactive", 0, cursor.count)
          android.util.Log.i("BillingAcceptance", "Local Premium cache row absent; Google Play ownership unchanged")
          return
        }
        assertTrue("A purchased Premium cache row is required before this probe", cursor.moveToFirst())
        assertEquals(if (reset) 0 else 1, cursor.getInt(0))
      }
      android.util.Log.i("BillingAcceptance", if (reset)
          "Local Premium cache reset to inactive; Google Play ownership unchanged"
          else "Local Premium cache verified active after real store restoration")
    }
  }
}
