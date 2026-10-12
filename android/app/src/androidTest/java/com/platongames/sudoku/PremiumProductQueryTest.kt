package com.platongames.sudoku

import androidx.test.platform.app.InstrumentationRegistry
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.Assert.*
import org.junit.Test

/** Target only the dedicated disposable Play emulator; the live probe never starts a purchase. */
class PremiumProductQueryTest {
  private fun result(code: Int) = BillingResult.newBuilder().setResponseCode(code).build()

  @Test fun unsupportedFeatureStopsBeforeQueryWithoutRetry() {
    var queries = 0
    var completions = 0
    PremiumProductQuery({ result(-2) }, { queries++ }).load { result, product, status, stage, support ->
      completions++
      assertEquals(-2, result.responseCode)
      assertNull(product)
      assertNull(status)
      assertEquals("check_feature", stage)
      assertEquals("unsupported", support)
    }
    assertEquals(0, queries)
    assertEquals(1, completions)
  }

  @Test fun transientSupportFailureDoesNotClaimUnsupported() {
    PremiumProductQuery({ result(-1) }, { fail("Must not query before a successful check") })
        .load { result, _, _, stage, support ->
          assertEquals(-1, result.responseCode)
          assertEquals("check_feature", stage)
          assertEquals("unknown", support)
        }
  }

  @Test fun supportedQueryPreservesPerProductStatusAndLaterUnsupportedResponse() {
    var queries = 0
    PremiumProductQuery({ result(0) }, { completion ->
      queries++
      completion(result(-2), null, 4)
    }).load { result, _, status, stage, support ->
      assertEquals(-2, result.responseCode)
      assertEquals(4, status)
      assertEquals("query_product", stage)
      assertEquals("supported", support)
    }
    assertEquals(1, queries)
  }

  @Test fun environmentContainsOnlyExplicitPlayComponentsAndTestCategory() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val environment = BillingEnvironment.collect(context, "unsupported")
    assertEquals(setOf("productDetailsSupport", "playStoreVersion", "playServicesVersion", "testEnvironment"), environment.keys().asSequence().toSet())
    assertEquals("unsupported", environment.getString("productDetailsSupport"))
    for (key in listOf("playStoreVersion", "playServicesVersion"))
      assertTrue(environment.getString(key).matches(Regex("[0-9]{1,19}|missing|unknown")))
    assertTrue(environment.getString("testEnvironment") in setOf("standard", "test_lab", "unknown"))
  }

  @Test fun liveProductAndIndependentOwnedPurchaseQuery() {
    if (InstrumentationRegistry.getArguments().getString("billingProbe") != "live") return
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val client = BillingClient.newBuilder(context)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .setListener { _, _ -> }
        .enableAutoServiceReconnection()
        .build()
    try {
      val connected = CountDownLatch(1)
      var connectionCode = Int.MIN_VALUE
      client.startConnection(object : BillingClientStateListener {
        override fun onBillingSetupFinished(result: BillingResult) {
          connectionCode = result.responseCode
          connected.countDown()
        }
        override fun onBillingServiceDisconnected() {}
      })
      assertTrue("Billing setup timed out", connected.await(30, TimeUnit.SECONDS))
      assertEquals(0, connectionCode)
      val loaded = CountDownLatch(1)
      var productCode = Int.MIN_VALUE
      var price: String? = null
      PremiumProductQuery(client).load { result, product, _, stage, support ->
        productCode = result.responseCode
        price = product?.oneTimePurchaseOfferDetailsList?.firstOrNull()?.formattedPrice
            ?: product?.oneTimePurchaseOfferDetails?.formattedPrice
        assertEquals("query_product", stage)
        assertEquals("supported", support)
        loaded.countDown()
      }
      assertTrue("Product query timed out", loaded.await(30, TimeUnit.SECONDS))
      assertEquals(0, productCode)
      assertFalse("Missing localized price", price.isNullOrBlank())
      val owned = CountDownLatch(1)
      var ownedCode = Int.MIN_VALUE
      var premiumPurchaseCount = 0
      val requireOwned = InstrumentationRegistry.getArguments().getString("requireOwned") == "true"
      val forcedUnsupported = PremiumProductQuery({ result(-2) }, { fail("Unsupported metadata must not query") })
      forcedUnsupported.load { _, _, _, _, _ -> }
      client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { result, purchases ->
        ownedCode = result.responseCode
        premiumPurchaseCount = purchases.count { it.products.contains("premium") }
        // Any actual owned purchase must still pass the production signature verifier.
        for (purchase in purchases.filter { it.products.contains("premium") }) {
          assertTrue(GooglePlayPurchaseVerifier().verify(purchase.originalJson, purchase.signature))
          if (requireOwned) {
            assertEquals(Purchase.PurchaseState.PURCHASED, purchase.purchaseState)
            assertTrue("The completed test purchase must be acknowledged", purchase.isAcknowledged)
            assertFalse(purchase.isSuspended)
          }
        }
        owned.countDown()
      }
      assertTrue("Owned query timed out", owned.await(30, TimeUnit.SECONDS))
      assertEquals(0, ownedCode)
      if (requireOwned) assertTrue("A real owned Premium test order is required", premiumPurchaseCount > 0)
      android.util.Log.i("BillingProbe", "Live product price=$price; independent owned query OK; premiumPurchases=$premiumPurchaseCount; environment=${BillingEnvironment.collect(context, "supported")}")
    } finally { client.endConnection() }
  }

  /** Logs external outcomes without treating an unavailable test account as product success. */
  @Test fun compareLegacyAndGuardedQueriesInRealPlayEnvironment() {
    if (InstrumentationRegistry.getArguments().getString("billingProbe") != "compatibility") return
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val client = BillingClient.newBuilder(context)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .setListener { _, _ -> }
        .enableAutoServiceReconnection()
        .build()
    try {
      val connected = CountDownLatch(1)
      var connectionCode = Int.MIN_VALUE
      client.startConnection(object : BillingClientStateListener {
        override fun onBillingSetupFinished(result: BillingResult) {
          connectionCode = result.responseCode
          connected.countDown()
        }
        override fun onBillingServiceDisconnected() {}
      })
      assertTrue("Billing setup timed out", connected.await(30, TimeUnit.SECONDS))
      android.util.Log.i("BillingProbe", "Compatibility API=${android.os.Build.VERSION.SDK_INT}; setup=$connectionCode; environment=${BillingEnvironment.collect(context, "unknown")}")
      if (connectionCode != BillingClient.BillingResponseCode.OK) return

      val legacyDone = CountDownLatch(1)
      val product = QueryProductDetailsParams.Product.newBuilder()
          .setProductId("premium").setProductType(BillingClient.ProductType.INAPP).build()
      client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(listOf(product)).build()) { result, details ->
        val premium = details.productDetailsList.firstOrNull { it.productId == "premium" }
        val price = premium?.oneTimePurchaseOfferDetailsList?.firstOrNull()?.formattedPrice
            ?: premium?.oneTimePurchaseOfferDetails?.formattedPrice
        val status = details.unfetchedProductList.firstOrNull { it.productId == "premium" }?.statusCode
        android.util.Log.i("BillingProbe", "Legacy query code=${result.responseCode}; productFound=${premium != null}; price=$price; unfetched=$status")
        legacyDone.countDown()
      }
      assertTrue("Legacy query timed out", legacyDone.await(30, TimeUnit.SECONDS))
      val support = client.isFeatureSupported(BillingClient.FeatureType.PRODUCT_DETAILS)
      android.util.Log.i("BillingProbe", "Feature check code=${support.responseCode}")
      val guardedDone = CountDownLatch(1)
      PremiumProductQuery(client).load { result, premium, status, stage, category ->
        val price = premium?.oneTimePurchaseOfferDetailsList?.firstOrNull()?.formattedPrice
            ?: premium?.oneTimePurchaseOfferDetails?.formattedPrice
        android.util.Log.i("BillingProbe", "Guarded query code=${result.responseCode}; stage=$stage; support=$category; productFound=${premium != null}; price=$price; unfetched=$status")
        guardedDone.countDown()
      }
      assertTrue("Guarded query timed out", guardedDone.await(30, TimeUnit.SECONDS))
      val ownedDone = CountDownLatch(1)
      client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { result, purchases ->
        android.util.Log.i("BillingProbe", "Owned query code=${result.responseCode}; premiumPurchases=${purchases.count { it.products.contains("premium") }}")
        ownedDone.countDown()
      }
      assertTrue("Owned query timed out", ownedDone.await(30, TimeUnit.SECONDS))
    } finally { client.endConnection() }
  }
}
