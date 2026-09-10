package com.jackli717.sudoku

import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.GetBillingConfigParams
import com.android.billingclient.api.PendingPurchasesParams
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.jackli717.sudoku.specs.NativeAdMarketSpec

@ReactModule(name = AdMarketModule.NAME)
class AdMarketModule(private val reactContext: ReactApplicationContext) :
    NativeAdMarketSpec(reactContext) {
  private var billingClient: BillingClient? = null
  private var pendingPromise: Promise? = null

  override fun getStoreCountryCode(promise: Promise) {
    if (pendingPromise != null) {
      promise.reject("E_STORE_MARKET_BUSY", "A store market request is already running")
      return
    }
    pendingPromise = promise
    val client =
        BillingClient.newBuilder(reactContext)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
            )
            .setListener { _, _ -> }
            .build()
    billingClient = client
    client.startConnection(
        object : BillingClientStateListener {
          override fun onBillingSetupFinished(result: BillingResult) {
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
              finishWithError("E_STORE_MARKET_UNAVAILABLE", result.debugMessage)
              return
            }
            client.getBillingConfigAsync(GetBillingConfigParams.newBuilder().build()) {
                configResult,
                config ->
              if (configResult.responseCode != BillingClient.BillingResponseCode.OK ||
                  config?.countryCode.isNullOrBlank()) {
                finishWithError("E_STORE_MARKET_UNAVAILABLE", configResult.debugMessage)
              } else {
                val current = pendingPromise
                pendingPromise = null
                billingClient = null
                client.endConnection()
                current?.resolve(config.countryCode)
              }
            }
          }

          override fun onBillingServiceDisconnected() {
            finishWithError("E_STORE_MARKET_UNAVAILABLE", "Billing service disconnected")
          }
        },
    )
  }

  override fun invalidate() {
    pendingPromise?.reject("E_STORE_MARKET_CLOSED", "Store market module closed")
    pendingPromise = null
    billingClient?.endConnection()
    billingClient = null
    super.invalidate()
  }

  private fun finishWithError(code: String, message: String) {
    val current = pendingPromise
    pendingPromise = null
    billingClient?.endConnection()
    billingClient = null
    current?.reject(code, message)
  }

  companion object {
    const val NAME = NativeAdMarketSpec.NAME
  }
}
