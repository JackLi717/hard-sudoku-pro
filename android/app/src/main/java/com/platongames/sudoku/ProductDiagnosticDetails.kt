package com.platongames.sudoku

import org.json.JSONObject

/** Event-local Crashlytics details only; never forward arbitrary JS/native error data. */
internal object ProductDiagnosticDetails {
  fun sanitize(details: String): Map<String, Any> {
    val result = mutableMapOf<String, Any>()
    try {
      val source = JSONObject(details)
      val allowed = mapOf(
        "build_environment" to setOf("production", "closed_beta", "development"),
        "product" to setOf("lifetime_premium"),
        "entry" to setOf("startup", "premium_page"),
        "stage" to setOf("connect", "check_feature", "query_product", "select_offer", "decode_product", "unknown"),
        "reason" to setOf("offline", "store_unavailable", "product_unavailable", "feature_unsupported", "developer_error", "invalid_store_response", "unexpected"),
        "product_details_support" to setOf("supported", "unsupported", "unknown"),
        "test_environment" to setOf("test_lab", "standard", "unknown"),
      )
      for ((key, values) in allowed) {
        val value = source.opt(key)
        if (value is String && value in values) result[key] = value
      }
      for (key in listOf("play_store_version", "play_services_version")) {
        val value = source.opt(key)
        if (value is String && value.matches(Regex("[0-9]{1,19}|missing|unknown")))
          result[key] = value
      }
      val code = source.optString("error_code")
      if (code.matches(Regex("billing_(-2|-1|[0-8]|12)|E_STORE_OFFLINE|E_NETWORK|E_STORE_UNAVAILABLE|E_PRODUCT_UNAVAILABLE|E_PRODUCT_NO_OFFER|E_INVALID_STORE_RESPONSE|unknown"))) result["error_code"] = code
      val response = source.optString("billing_response")
      if (response.matches(Regex("-2|-1|[0-8]|12"))) result["billing_response"] = response
      val status = source.optInt("unfetched_status", -1)
      if (status in 0..4) result["unfetched_status"] = status
      val attempts = source.optInt("attempts", 0)
      if (attempts in 1..3) result["attempts"] = attempts
    } catch (_: Exception) { }
    return result
  }
}
