package com.platongames.sudoku

import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.QueryProductDetailsParams

/** Product metadata capability must never gate the independent owned-purchase query. */
internal class PremiumProductQuery(
    private val checkSupport: () -> BillingResult,
    private val query: ((BillingResult, ProductDetails?, Int?) -> Unit) -> Unit,
) {
  constructor(client: BillingClient) : this(
      { client.isFeatureSupported(BillingClient.FeatureType.PRODUCT_DETAILS) },
      { completion ->
        val product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId("premium")
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        val params = QueryProductDetailsParams.newBuilder().setProductList(listOf(product)).build()
        client.queryProductDetailsAsync(params) { result, details ->
          completion(result,
              details.productDetailsList.firstOrNull {
                it.productId == "premium" && it.productType == BillingClient.ProductType.INAPP
              },
              details.unfetchedProductList.firstOrNull { it.productId == "premium" }?.statusCode)
        }
      },
  )

  fun load(completion: (BillingResult, ProductDetails?, Int?, String, String) -> Unit) {
    val support = checkSupport()
    if (support.responseCode != BillingClient.BillingResponseCode.OK) {
      completion(support, null, null, "check_feature", supportCategory(support))
      return
    }
    query { result, product, unfetchedStatus ->
      completion(result, product, unfetchedStatus, "query_product", "supported")
    }
  }

  private fun supportCategory(result: BillingResult): String =
      if (result.responseCode == BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED)
          "unsupported" else "unknown"
}
