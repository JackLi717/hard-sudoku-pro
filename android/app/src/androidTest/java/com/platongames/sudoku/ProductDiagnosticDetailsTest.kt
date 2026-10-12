package com.platongames.sudoku

import org.junit.Assert.*
import org.junit.Test

class ProductDiagnosticDetailsTest {
  @Test fun keepsFeatureFailureAndFullSafeEnvironment() {
    val details = ProductDiagnosticDetails.sanitize("""{
      "build_environment":"development","product":"lifetime_premium",
      "entry":"startup","stage":"check_feature","reason":"feature_unsupported",
      "error_code":"billing_-2","billing_response":"-2","attempts":1,
      "product_details_support":"unsupported","play_store_version":"85354820",
      "play_services_version":"263737022","test_environment":"standard",
      "purchase_token":"private","account":"private","message":"private"
    }""")
    assertEquals("check_feature", details["stage"])
    assertEquals("unsupported", details["product_details_support"])
    assertEquals("85354820", details["play_store_version"])
    assertEquals("263737022", details["play_services_version"])
    assertEquals("standard", details["test_environment"])
    assertEquals("-2", details["billing_response"])
    assertEquals("billing_-2", details["error_code"])
    assertEquals(1, details["attempts"])
    assertFalse(details.toString().contains("private"))
    assertEquals(12, details.size)
  }

  @Test fun rejectsFreeTextAndMalformedOrNumericEnvironmentValues() {
    for (value in listOf("\"private@example.com\"", "123", "null", "{}", "[]", "true")) {
      val details = ProductDiagnosticDetails.sanitize("""{
        "stage":$value,"product_details_support":$value,"test_environment":$value,
        "play_store_version":$value,"play_services_version":$value,
        "error_code":"private","billing_response":99,"attempts":4,"unfetched_status":9
      }""")
      assertTrue(details.toString(), details.isEmpty())
    }
    assertTrue(ProductDiagnosticDetails.sanitize("not-json").isEmpty())
    assertTrue(ProductDiagnosticDetails.sanitize("[]").isEmpty())
  }

  @Test fun keepsMissingUnknownAndTestLabWithoutLeakingPreviousEventKeys() {
    assertEquals(mapOf(
      "product_details_support" to "unknown", "play_store_version" to "missing",
      "play_services_version" to "unknown", "test_environment" to "test_lab",
    ), ProductDiagnosticDetails.sanitize("""{
      "product_details_support":"unknown","play_store_version":"missing",
      "play_services_version":"unknown","test_environment":"test_lab"
    }"""))
    assertTrue(ProductDiagnosticDetails.sanitize("{}").isEmpty())
    for (version in listOf("-1", "1.2.3", "1e8", "12345678901234567890")) {
      assertTrue(ProductDiagnosticDetails.sanitize("""{"play_store_version":"$version"}""").isEmpty())
    }
  }

  @Test fun preservesExistingQueryFailureDiagnostics() {
    assertEquals(mapOf(
      "stage" to "query_product", "reason" to "product_unavailable",
      "error_code" to "E_PRODUCT_UNAVAILABLE", "billing_response" to "4",
      "unfetched_status" to 2, "attempts" to 3,
    ), ProductDiagnosticDetails.sanitize("""{
      "stage":"query_product","reason":"product_unavailable",
      "error_code":"E_PRODUCT_UNAVAILABLE","billing_response":"4",
      "unfetched_status":2,"attempts":3
    }"""))
  }
}
