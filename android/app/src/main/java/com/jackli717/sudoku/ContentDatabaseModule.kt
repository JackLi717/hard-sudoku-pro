package com.jackli717.sudoku

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.jackli717.sudoku.specs.NativeContentDatabaseSpec
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.concurrent.Executors

@ReactModule(name = ContentDatabaseModule.NAME)
class ContentDatabaseModule(private val reactContext: ReactApplicationContext) :
    NativeContentDatabaseSpec(reactContext) {
  private val executor = Executors.newSingleThreadExecutor()

  override fun installBundledContentDatabase(
      assetName: String,
      targetName: String,
      expectedSha256: String,
      promise: Promise,
  ) {
    executor.execute {
      try {
        require(SAFE_NAME.matches(assetName)) { "Invalid content asset name" }
        require(SAFE_NAME.matches(targetName)) { "Invalid content target name" }
        require(SHA256.matches(expectedSha256)) { "Invalid content SHA-256" }

        val directory = File(reactContext.filesDir, DATABASE_LOCATION)
        check(directory.exists() || directory.mkdirs()) {
          "Could not create the content database directory"
        }
        val target = File(directory, targetName)
        if (target.isFile && sha256(target) == expectedSha256.lowercase()) {
          promise.resolve(DATABASE_LOCATION)
          return@execute
        }

        val temporary = File(directory, "$targetName.installing")
        temporary.delete()
        reactContext.assets.open(assetName).use { input ->
          FileOutputStream(temporary).use { output ->
            input.copyTo(output)
            output.fd.sync()
          }
        }
        check(sha256(temporary) == expectedSha256.lowercase()) {
          temporary.delete()
          "Bundled content database checksum mismatch"
        }
        if (target.exists() && !target.delete()) {
          error("Could not replace the invalid content database")
        }
        check(temporary.renameTo(target)) { "Could not install the content database" }
        promise.resolve(DATABASE_LOCATION)
      } catch (error: Throwable) {
        promise.reject("E_CONTENT_INSTALL", error.message, error)
      }
    }
  }

  override fun invalidate() {
    executor.shutdownNow()
    super.invalidate()
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    FileInputStream(file).use { input ->
      val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
      while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        digest.update(buffer, 0, count)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }

  companion object {
    const val NAME = NativeContentDatabaseSpec.NAME
    private const val DATABASE_LOCATION = "databases"
    private val SAFE_NAME = Regex("^[A-Za-z0-9._-]+$")
    private val SHA256 = Regex("^[A-Fa-f0-9]{64}$")
  }
}
