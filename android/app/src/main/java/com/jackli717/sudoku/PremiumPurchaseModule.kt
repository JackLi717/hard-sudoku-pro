package com.jackli717.sudoku

import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.jackli717.sudoku.specs.NativePremiumPurchaseSpec
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

@ReactModule(name = PremiumPurchaseModule.NAME)
class PremiumPurchaseModule(private val reactContext: ReactApplicationContext) :
    NativePremiumPurchaseSpec(reactContext), PurchasesUpdatedListener {
  private data class ConnectionWaiter(
      val ready: (BillingClient) -> Unit,
      val failed: (BillingResult) -> Unit,
  )

  private var billingClient: BillingClient? = null
  private var connecting = false
  private val connectionWaiters = mutableListOf<ConnectionWaiter>()
  private var purchasePromise: Promise? = null
  private val transactionUpdates = mutableListOf<JSONObject>()

  override fun initialize(promise: Promise) {
    onUiThread {
      withBillingClient(
          { promise.resolve(null) },
          { result -> promise.reject(errorCode(result), result.debugMessage) },
      )
    }
  }

  override fun getPremiumProduct(promise: Promise) {
    onUiThread {
      withBillingClient(
          { client ->
            queryPremiumProduct(client) { result, product ->
              if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                promise.reject(errorCode(result), result.debugMessage)
                return@queryPremiumProduct
              }
              if (product == null) {
                promise.reject("E_PRODUCT_UNAVAILABLE", "Premium is not available")
                return@queryPremiumProduct
              }
              val offer = premiumOffer(product)
              if (offer == null) {
                promise.reject("E_PRODUCT_UNAVAILABLE", "Premium has no eligible offer")
                return@queryPremiumProduct
              }
              promise.resolve(
                  JSONObject()
                      .put("id", PREMIUM_PRODUCT_ID)
                      .put("title", product.title)
                      .put("description", product.description)
                      .put("displayPrice", offer.formattedPrice)
                      .toString(),
              )
            }
          },
          { result -> promise.reject(errorCode(result), result.debugMessage) },
      )
    }
  }

  override fun purchasePremium(promise: Promise) {
    onUiThread {
      if (purchasePromise != null) {
        promise.resolve(unavailable("operation_in_progress").toString())
        return@onUiThread
      }
      val activity = reactContext.currentActivity
      if (activity == null) {
        promise.resolve(unavailable("no_activity").toString())
        return@onUiThread
      }
      withBillingClient(
          { client ->
            queryPremiumProduct(client) { result, product ->
              if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                promise.resolve(resultPayload(result).toString())
                return@queryPremiumProduct
              }
              val offer = product?.let(::premiumOffer)
              if (product == null || offer == null) {
                promise.resolve(unavailable("product_unavailable").toString())
                return@queryPremiumProduct
              }
              val detailsBuilder =
                  BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product)
              val offerToken = offer.offerToken
              if (!offerToken.isNullOrBlank()) {
                detailsBuilder.setOfferToken(offerToken)
              }
              val flowParams =
                  BillingFlowParams.newBuilder()
                      .setProductDetailsParamsList(listOf(detailsBuilder.build()))
                      .build()
              purchasePromise = promise
              val launchResult = client.launchBillingFlow(activity, flowParams)
              if (launchResult.responseCode != BillingClient.BillingResponseCode.OK) {
                purchasePromise = null
                if (launchResult.responseCode == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
                  resolveOwnedPurchase(client, promise)
                } else {
                  promise.resolve(resultPayload(launchResult).toString())
                }
              }
            }
          },
          { result -> promise.resolve(resultPayload(result).toString()) },
      )
    }
  }

  override fun restorePremium(promise: Promise) {
    onUiThread {
      withBillingClient(
          { client ->
            queryPremiumPurchases(client) { result, purchases ->
              if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                promise.resolve(resultPayload(result).toString())
                return@queryPremiumPurchases
              }
              val premiumPurchases = purchases.filter(::containsPremium)
              val purchased =
                  premiumPurchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
              val transactions = purchased.mapNotNull(::transactionJson)
              if (transactions.size != purchased.size) {
                promise.resolve(failed("invalid_purchase").toString())
              } else if (transactions.isNotEmpty()) {
                promise.resolve(
                    JSONObject()
                        .put("status", "restored")
                        .put("transactions", JSONArray(transactions))
                        .toString(),
                )
              } else if (
                  premiumPurchases.any { it.purchaseState == Purchase.PurchaseState.PENDING }
              ) {
                promise.resolve(unavailable("pending").toString())
              } else {
                promise.resolve(JSONObject().put("status", "nothing_to_restore").toString())
              }
            }
          },
          { result -> promise.resolve(resultPayload(result).toString()) },
      )
    }
  }

  override fun refreshPremiumEntitlement(promise: Promise) {
    onUiThread {
      withBillingClient(
          { client ->
            queryPremiumPurchases(client) { result, purchases ->
              if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                promise.resolve(resultPayload(result).toString())
                return@queryPremiumPurchases
              }
              val premiumPurchases = purchases.filter(::containsPremium)
              val purchased =
                  premiumPurchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
              val transactions = purchased.mapNotNull(::transactionJson)
              if (transactions.size != purchased.size) {
                promise.resolve(failed("invalid_purchase").toString())
              } else if (transactions.isNotEmpty()) {
                promise.resolve(
                    JSONObject()
                        .put("status", "verified")
                        .put("transactions", JSONArray(transactions))
                        .toString(),
                )
              } else if (
                  premiumPurchases.any { it.purchaseState == Purchase.PurchaseState.PENDING }
              ) {
                promise.resolve(unavailable("pending").toString())
              } else {
                promise.resolve(
                    JSONObject()
                        .put("status", "not_entitled")
                        .put("platform", "android")
                        .put("verifiedAtEpochMs", System.currentTimeMillis())
                        .toString(),
                )
              }
            }
          },
          { result -> promise.resolve(resultPayload(result).toString()) },
      )
    }
  }

  override fun drainTransactionUpdates(promise: Promise) {
    onUiThread {
      val updates = JSONArray(transactionUpdates.toList())
      transactionUpdates.clear()
      promise.resolve(updates.toString())
    }
  }

  override fun finishTransaction(completionCredential: String, promise: Promise) {
    onUiThread {
      if (completionCredential.isBlank()) {
        promise.reject("E_INVALID_CREDENTIAL", "A purchase token is required")
        return@onUiThread
      }
      withBillingClient(
          { client ->
            queryPremiumPurchases(client) { queryResult, purchases ->
              if (queryResult.responseCode != BillingClient.BillingResponseCode.OK) {
                promise.reject(errorCode(queryResult), queryResult.debugMessage)
                return@queryPremiumPurchases
              }
              val purchase =
                  purchases.firstOrNull {
                    it.purchaseToken == completionCredential &&
                        containsPremium(it) &&
                        it.purchaseState == Purchase.PurchaseState.PURCHASED
                  }
              if (purchase == null) {
                promise.reject("E_PURCHASE_NOT_CURRENT", "The purchase is no longer current")
                return@queryPremiumPurchases
              }
              if (purchase.isAcknowledged) {
                promise.resolve(null)
                return@queryPremiumPurchases
              }
              val params =
                  AcknowledgePurchaseParams.newBuilder()
                      .setPurchaseToken(completionCredential)
                      .build()
              client.acknowledgePurchase(params) { acknowledgeResult ->
                if (acknowledgeResult.responseCode == BillingClient.BillingResponseCode.OK) {
                  promise.resolve(null)
                } else {
                  promise.reject(errorCode(acknowledgeResult), acknowledgeResult.debugMessage)
                }
              }
            }
          },
          { result -> promise.reject(errorCode(result), result.debugMessage) },
      )
    }
  }

  override fun close() {
    onUiThread {
      purchasePromise?.resolve(unavailable("store_closed").toString())
      purchasePromise = null
      failConnectionWaiters(
          BillingResult.newBuilder()
              .setResponseCode(BillingClient.BillingResponseCode.SERVICE_DISCONNECTED)
              .setDebugMessage("Store closed")
              .build(),
      )
      billingClient?.endConnection()
      billingClient = null
      transactionUpdates.clear()
    }
  }

  override fun invalidate() {
    close()
    super.invalidate()
  }

  override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
    onUiThread {
      val pending = purchasePromise
      if (pending != null) {
        when (result.responseCode) {
          BillingClient.BillingResponseCode.USER_CANCELED -> {
            purchasePromise = null
            pending.resolve(JSONObject().put("status", "cancelled").toString())
          }
          BillingClient.BillingResponseCode.OK -> handlePurchaseResult(pending, purchases.orEmpty())
          else -> {
            purchasePromise = null
            pending.resolve(resultPayload(result).toString())
          }
        }
        return@onUiThread
      }
      if (result.responseCode != BillingClient.BillingResponseCode.OK) return@onUiThread
      for (purchase in purchases.orEmpty()) {
        if (
            containsPremium(purchase) &&
                purchase.purchaseState == Purchase.PurchaseState.PURCHASED
        ) {
          verifyCurrentPurchase(purchase) { transaction ->
            if (transaction != null) transactionUpdates.add(transaction)
          }
        }
      }
    }
  }

  private fun handlePurchaseResult(promise: Promise, purchases: List<Purchase>) {
    val premiumPurchases = purchases.filter(::containsPremium)
    val purchased =
        premiumPurchases.firstOrNull { it.purchaseState == Purchase.PurchaseState.PURCHASED }
    if (purchased != null) {
      verifyCurrentPurchase(purchased) { transaction ->
        purchasePromise = null
        if (transaction == null) {
          promise.resolve(failed("purchase_not_verified").toString())
        } else {
          promise.resolve(
              JSONObject()
                  .put("status", "purchased")
                  .put("transaction", transaction)
                  .toString(),
          )
        }
      }
      return
    }
    purchasePromise = null
    if (premiumPurchases.any { it.purchaseState == Purchase.PurchaseState.PENDING }) {
      promise.resolve(JSONObject().put("status", "pending").toString())
    } else {
      promise.resolve(failed("invalid_purchase").toString())
    }
  }

  private fun resolveOwnedPurchase(client: BillingClient, promise: Promise) {
    queryPremiumPurchases(client) { result, purchases ->
      if (result.responseCode != BillingClient.BillingResponseCode.OK) {
        promise.resolve(resultPayload(result).toString())
        return@queryPremiumPurchases
      }
      val purchase =
          purchases.firstOrNull {
            containsPremium(it) && it.purchaseState == Purchase.PurchaseState.PURCHASED
          }
      val transaction = purchase?.let(::transactionJson)
      if (transaction == null) {
        promise.resolve(failed("purchase_not_verified").toString())
      } else {
        promise.resolve(
            JSONObject()
                .put("status", "purchased")
                .put("transaction", transaction)
                .toString(),
        )
      }
    }
  }

  private fun verifyCurrentPurchase(purchase: Purchase, completion: (JSONObject?) -> Unit) {
    val client = billingClient
    if (client == null || !client.isReady) {
      completion(null)
      return
    }
    queryPremiumPurchases(client) { result, purchases ->
      if (result.responseCode != BillingClient.BillingResponseCode.OK) {
        completion(null)
        return@queryPremiumPurchases
      }
      completion(
          purchases
              .firstOrNull {
                it.purchaseToken == purchase.purchaseToken &&
                    containsPremium(it) &&
                    it.purchaseState == Purchase.PurchaseState.PURCHASED
              }
              ?.let(::transactionJson),
      )
    }
  }

  private fun transactionJson(purchase: Purchase): JSONObject? {
    if (
        !containsPremium(purchase) ||
            purchase.products.size != 1 ||
            purchase.packageName != reactContext.packageName ||
            purchase.purchaseToken.isBlank() ||
            purchase.purchaseState != Purchase.PurchaseState.PURCHASED ||
            purchase.isSuspended
    ) {
      return null
    }
    val transactionId = sha256(purchase.purchaseToken)
    return JSONObject()
        .put("productId", PREMIUM_PRODUCT_ID)
        .put("platform", "android")
        .put("transactionId", "play:$transactionId")
        .put("completionCredential", purchase.purchaseToken)
        .put("originalTransactionId", JSONObject.NULL)
        .put("purchasedAtEpochMs", purchase.purchaseTime)
        .put("verifiedAtEpochMs", System.currentTimeMillis())
        .put("status", "active")
        .put("verification", "platform_verified")
  }

  private fun queryPremiumProduct(
      client: BillingClient,
      completion: (BillingResult, ProductDetails?) -> Unit,
  ) {
    val product =
        QueryProductDetailsParams.Product.newBuilder()
            .setProductId(PREMIUM_PRODUCT_ID)
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
    val params = QueryProductDetailsParams.newBuilder().setProductList(listOf(product)).build()
    client.queryProductDetailsAsync(params) { result, details ->
      completion(
          result,
          details.productDetailsList.firstOrNull {
            it.productId == PREMIUM_PRODUCT_ID && it.productType == BillingClient.ProductType.INAPP
          },
      )
    }
  }

  private fun queryPremiumPurchases(
      client: BillingClient,
      completion: (BillingResult, List<Purchase>) -> Unit,
  ) {
    val params =
        QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
    client.queryPurchasesAsync(params) { result, purchases -> completion(result, purchases) }
  }

  private fun premiumOffer(
      product: ProductDetails,
  ): ProductDetails.OneTimePurchaseOfferDetails? =
      product.oneTimePurchaseOfferDetailsList.orEmpty().firstOrNull()
          ?: product.oneTimePurchaseOfferDetails

  private fun containsPremium(purchase: Purchase): Boolean =
      purchase.products.contains(PREMIUM_PRODUCT_ID)

  private fun withBillingClient(
      ready: (BillingClient) -> Unit,
      failed: (BillingResult) -> Unit,
  ) {
    val existing = billingClient
    if (existing?.isReady == true) {
      ready(existing)
      return
    }
    connectionWaiters.add(ConnectionWaiter(ready, failed))
    if (connecting) return
    connecting = true
    val client =
        existing
            ?: BillingClient.newBuilder(reactContext)
                .enablePendingPurchases(
                    PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
                )
                .setListener(this)
                .build()
    billingClient = client
    client.startConnection(
        object : BillingClientStateListener {
          override fun onBillingSetupFinished(result: BillingResult) {
            onUiThread {
              connecting = false
              if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                val waiters = connectionWaiters.toList()
                connectionWaiters.clear()
                waiters.forEach { it.ready(client) }
              } else {
                failConnectionWaiters(result)
              }
            }
          }

          override fun onBillingServiceDisconnected() {
            onUiThread {
              connecting = false
              val disconnected =
                  BillingResult.newBuilder()
                      .setResponseCode(BillingClient.BillingResponseCode.SERVICE_DISCONNECTED)
                      .setDebugMessage("Billing service disconnected")
                      .build()
              failConnectionWaiters(disconnected)
              purchasePromise?.resolve(resultPayload(disconnected).toString())
              purchasePromise = null
            }
          }
        },
    )
  }

  private fun failConnectionWaiters(result: BillingResult) {
    val waiters = connectionWaiters.toList()
    connectionWaiters.clear()
    waiters.forEach { it.failed(result) }
  }

  private fun resultPayload(result: BillingResult): JSONObject =
      when (result.responseCode) {
        BillingClient.BillingResponseCode.USER_CANCELED ->
            JSONObject().put("status", "cancelled")
        BillingClient.BillingResponseCode.NETWORK_ERROR,
        BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> unavailable("offline")
        BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE,
        BillingClient.BillingResponseCode.BILLING_UNAVAILABLE,
        BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED,
        BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> unavailable("store_unavailable")
        else -> failed(errorCode(result))
      }

  private fun unavailable(reason: String): JSONObject =
      JSONObject().put("status", "unavailable").put("reason", reason)

  private fun failed(code: String): JSONObject =
      JSONObject().put("status", "failed").put("errorCode", code)

  private fun errorCode(result: BillingResult): String =
      when (result.responseCode) {
        BillingClient.BillingResponseCode.NETWORK_ERROR,
        BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> "E_STORE_OFFLINE"
        BillingClient.BillingResponseCode.BILLING_UNAVAILABLE,
        BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> "E_STORE_UNAVAILABLE"
        else -> "billing_${result.responseCode}"
      }

  private fun sha256(value: String): String =
      MessageDigest.getInstance("SHA-256")
          .digest(value.toByteArray(Charsets.UTF_8))
          .joinToString("") { byte -> "%02x".format(byte) }

  private fun onUiThread(action: () -> Unit) {
    if (reactContext.isOnUiQueueThread) action() else reactContext.runOnUiQueueThread(action)
  }

  companion object {
    const val NAME = NativePremiumPurchaseSpec.NAME
    private const val PREMIUM_PRODUCT_ID = "premium"
  }
}
