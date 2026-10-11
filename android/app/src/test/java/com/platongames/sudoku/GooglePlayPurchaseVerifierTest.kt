package com.platongames.sudoku

import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.interfaces.RSAPublicKey
import java.security.spec.X509EncodedKeySpec
import java.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GooglePlayPurchaseVerifierTest {
  private val keys = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
  private val data = """{"productId":"premium","purchaseToken":"test-token","label":"永久"}"""

  private fun verifier(publicKey: String = Base64.getEncoder().encodeToString(keys.public.encoded)) =
      GooglePlayPurchaseVerifier(publicKey) { Base64.getDecoder().decode(it) }

  private fun sign(value: String, signingKeys: KeyPair = keys): String =
      Base64.getEncoder().encodeToString(Signature.getInstance("SHA1withRSA").run {
        initSign(signingKeys.private)
        update(value.toByteArray(Charsets.UTF_8))
        sign()
      })

  @Test fun acceptsAuthenticSignatureOverExactUtf8Data() {
    assertTrue(verifier().verify(data, sign(data)))
  }

  @Test fun rejectsTamperedPurchaseAndReserializedJson() {
    val signature = sign(data)
    assertFalse(verifier().verify(data.replace("premium", "other"), signature))
    assertFalse(verifier().verify(data.replace(",", ", "), signature))
  }

  @Test fun rejectsSignatureFromDifferentKey() {
    val otherKeys = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
    assertFalse(verifier().verify(data, sign(data, otherKeys)))
  }

  @Test fun rejectsMissingMalformedAndTruncatedSignatures() {
    assertFalse(verifier().verify("", sign(data)))
    assertFalse(verifier().verify(data, ""))
    assertFalse(verifier().verify(data, "not-base64!"))
    assertFalse(verifier().verify(data, Base64.getEncoder().encodeToString(byteArrayOf(1, 2, 3))))
  }

  @Test fun rejectsMalformedPublicKeyWithoutThrowing() {
    assertFalse(verifier("not-base64!").verify(data, sign(data)))
    assertFalse(verifier("AQID").verify(data, sign(data)))
  }

  @Test fun consolePublicKeyIsValid2048BitRsaAndRejectsUnrelatedSignature() {
    val encoded = GooglePlayPurchaseVerifier.BILLING_PUBLIC_KEY
    val key = KeyFactory.getInstance("RSA")
        .generatePublic(X509EncodedKeySpec(Base64.getDecoder().decode(encoded))) as RSAPublicKey
    assertEquals(2048, key.modulus.bitLength())
    assertFalse(verifier(encoded).verify(data, sign(data)))
  }
}
