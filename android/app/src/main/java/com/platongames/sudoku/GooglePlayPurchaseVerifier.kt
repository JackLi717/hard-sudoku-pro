package com.platongames.sudoku

import android.util.Base64
import java.security.GeneralSecurityException
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec

internal class GooglePlayPurchaseVerifier(
    base64PublicKey: String = BILLING_PUBLIC_KEY,
    private val decodeBase64: (String) -> ByteArray = { Base64.decode(it, Base64.DEFAULT) },
) {
  private val publicKey by lazy {
    KeyFactory.getInstance("RSA")
        .generatePublic(X509EncodedKeySpec(decodeBase64(base64PublicKey)))
  }

  fun verify(signedData: String, signature: String): Boolean {
    if (signedData.isBlank() || signature.isBlank()) return false
    return try {
      // Verify the exact JSON bytes returned by Play, without reserializing them.
      Signature.getInstance("SHA1withRSA").run {
        initVerify(publicKey)
        update(signedData.toByteArray(Charsets.UTF_8))
        verify(decodeBase64(signature))
      }
    } catch (_: GeneralSecurityException) {
      false
    } catch (_: IllegalArgumentException) {
      false
    }
  }

  companion object {
    // Platon Sudoku > Monetisation setup > Licensing. This is a public verification
    // key, not the upload/app-signing key or a server credential.
    const val BILLING_PUBLIC_KEY =
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv/80jb+/a6RAjp8PNg5OvY/cyWKhThxep2PD1kGJhsxXlGJZGNEiRObUpHN1SMdlbzGENdRv9Gc+6hrIdLO6mnvibrhH7aR8zdzGU5yPHRqvkVb61f0HobhzpvZ0RVFkNoIeabdE6kaHuxYUj4eCBZfzt5wA/8ylaY/g7Ah/ivw7DPAmXdwVoRqlzsVxeg5rZm4qqHjCbsiyWuI4oYpo462SJIOSrGxQvHQTi+v2e6AhtgVtNu88/rqKy9aj9gBsnzVMR525jAg8WyQsZsef+ZWhrKHE4JYb/FG14irxP0AOqyaWwRPQV9w6sLTVpJphbd++A5L8ulkvTSWySlSrWwIDAQAB"
  }
}
