package com.jackli717.sudoku

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.jackli717.sudoku.specs.NativeHintEngineSpec
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

@ReactModule(name = HintEngineModule.NAME)
class HintEngineModule(reactContext: ReactApplicationContext) :
    NativeHintEngineSpec(reactContext) {
  private val executor = Executors.newSingleThreadExecutor()
  private val pendingRequestIds = ConcurrentHashMap.newKeySet<String>()

  override fun nextStep(
      requestId: String,
      boardFingerprint: String,
      candidateMasks: String,
      givenCells: String,
      promise: Promise,
  ) {
    pendingRequestIds.add(requestId)
    nativePrepare(requestId)
    executor.execute {
      try {
        promise.resolve(
            nativeNextStep(requestId, boardFingerprint, candidateMasks, givenCells),
        )
      } catch (error: Throwable) {
        promise.reject("E_HINT_ENGINE", error.message, error)
      } finally {
        pendingRequestIds.remove(requestId)
      }
    }
  }

  override fun explainOpportunityEffects(
      requestId: String,
      boardFingerprint: String,
      candidateMasks: String,
      givenCells: String,
      observedEffects: String,
      promise: Promise,
  ) {
    pendingRequestIds.add(requestId)
    nativePrepare(requestId)
    executor.execute {
      try {
        promise.resolve(
            nativeExplainOpportunityEffects(
                requestId,
                boardFingerprint,
                candidateMasks,
                givenCells,
                observedEffects,
            ),
        )
      } catch (error: Throwable) {
        promise.reject("E_OPPORTUNITY_ANALYZER", error.message, error)
      } finally {
        pendingRequestIds.remove(requestId)
      }
    }
  }

  override fun cancel(requestId: String) {
    if (pendingRequestIds.contains(requestId)) {
      nativeCancel(requestId)
    }
  }

  override fun invalidate() {
    nativeCancelAll()
    pendingRequestIds.clear()
    executor.shutdownNow()
    super.invalidate()
  }

  private external fun nativeNextStep(
      requestId: String,
      boardFingerprint: String,
      candidateMasks: String,
      givenCells: String,
  ): String

  private external fun nativeExplainOpportunityEffects(
      requestId: String,
      boardFingerprint: String,
      candidateMasks: String,
      givenCells: String,
      observedEffects: String,
  ): String

  private external fun nativePrepare(requestId: String)

  private external fun nativeCancel(requestId: String)

  private external fun nativeCancelAll()

  companion object {
    const val NAME = NativeHintEngineSpec.NAME

    init {
      System.loadLibrary("appmodules")
    }
  }
}
