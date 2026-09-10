import Foundation
import StoreKit

@MainActor
@objc(HSPPremiumPurchaseService)
final class HSPPremiumPurchaseService: NSObject {
  private static let premiumProductID = "premium"
  private static let shared = HSPPremiumPurchaseService()

  private var updateTask: Task<Void, Never>?
  private var transactionUpdates: [[String: Any]] = []
  private var transactionsByCredential: [String: Transaction] = [:]

  @objc(initializeWithCompletion:)
  static func initialize(completion: @escaping (String?) -> Void) {
    Task { @MainActor in
      shared.startTransactionUpdates()
      completion(nil)
    }
  }

  @objc(getPremiumProductWithCompletion:)
  static func getPremiumProduct(
    completion: @escaping (String?, String?) -> Void
  ) {
    Task { @MainActor in
      do {
        guard let product = try await Product.products(for: [premiumProductID]).first,
              product.id == premiumProductID,
              product.type == .nonConsumable else {
          completion(nil, "E_PRODUCT_UNAVAILABLE")
          return
        }
        completion(shared.jsonString([
          "id": premiumProductID,
          "title": product.displayName,
          "description": product.description,
          "displayPrice": product.displayPrice,
        ]), nil)
      } catch {
        completion(nil, shared.errorCode(error))
      }
    }
  }

  @objc(purchasePremiumWithCompletion:)
  static func purchasePremium(
    completion: @escaping (String?, String?) -> Void
  ) {
    Task { @MainActor in
      shared.startTransactionUpdates()
      do {
        guard let product = try await Product.products(for: [premiumProductID]).first,
              product.id == premiumProductID,
              product.type == .nonConsumable else {
          completion(shared.jsonString(shared.unavailable("product_unavailable")), nil)
          return
        }
        switch try await product.purchase() {
        case .success(let verification):
          guard case .verified(let transaction) = verification,
                let payload = shared.transactionPayload(transaction) else {
            completion(shared.jsonString(shared.failed("unverified_transaction")), nil)
            return
          }
          completion(shared.jsonString([
            "status": "purchased",
            "transaction": payload,
          ]), nil)
        case .pending:
          completion(shared.jsonString(["status": "pending"]), nil)
        case .userCancelled:
          completion(shared.jsonString(["status": "cancelled"]), nil)
        @unknown default:
          completion(shared.jsonString(shared.failed("unknown_purchase_result")), nil)
        }
      } catch {
        completion(shared.jsonString(shared.resultPayload(error)), nil)
      }
    }
  }

  @objc(restorePremiumWithCompletion:)
  static func restorePremium(
    completion: @escaping (String?, String?) -> Void
  ) {
    Task { @MainActor in
      do {
        try await AppStore.sync()
        let transactions = try await shared.currentPremiumTransactions()
        if transactions.isEmpty {
          completion(shared.jsonString(["status": "nothing_to_restore"]), nil)
        } else {
          completion(shared.jsonString([
            "status": "restored",
            "transactions": transactions,
          ]), nil)
        }
      } catch {
        completion(shared.jsonString(shared.resultPayload(error)), nil)
      }
    }
  }

  @objc(refreshPremiumEntitlementWithCompletion:)
  static func refreshPremiumEntitlement(
    completion: @escaping (String?, String?) -> Void
  ) {
    Task { @MainActor in
      do {
        let transactions = try await shared.currentPremiumTransactions()
        if transactions.isEmpty {
          completion(shared.jsonString([
            "status": "not_entitled",
            "platform": "ios",
            "verifiedAtEpochMs": Date().timeIntervalSince1970 * 1_000,
          ]), nil)
        } else {
          completion(shared.jsonString([
            "status": "verified",
            "transactions": transactions,
          ]), nil)
        }
      } catch {
        completion(shared.jsonString(shared.resultPayload(error)), nil)
      }
    }
  }

  @objc(drainTransactionUpdatesWithCompletion:)
  static func drainTransactionUpdates(
    completion: @escaping (String?, String?) -> Void
  ) {
    Task { @MainActor in
      let updates = shared.transactionUpdates
      shared.transactionUpdates.removeAll()
      completion(shared.jsonString(updates), nil)
    }
  }

  @objc(finishTransaction:completion:)
  static func finishTransaction(
    _ completionCredential: String,
    completion: @escaping (String?) -> Void
  ) {
    Task { @MainActor in
      guard !completionCredential.isEmpty else {
        completion("E_INVALID_CREDENTIAL")
        return
      }
      if let transaction = shared.transactionsByCredential[completionCredential] {
        await transaction.finish()
        shared.transactionsByCredential.removeValue(forKey: completionCredential)
        completion(nil)
        return
      }
      for await verification in Transaction.all {
        guard case .verified(let transaction) = verification,
              String(transaction.id) == completionCredential,
              shared.transactionPayload(transaction) != nil else {
          continue
        }
        await transaction.finish()
        completion(nil)
        return
      }
      completion("E_TRANSACTION_NOT_FOUND")
    }
  }

  @objc(close)
  static func close() {
    Task { @MainActor in
      shared.updateTask?.cancel()
      shared.updateTask = nil
      shared.transactionUpdates.removeAll()
      shared.transactionsByCredential.removeAll()
    }
  }

  private func startTransactionUpdates() {
    guard updateTask == nil else { return }
    updateTask = Task { @MainActor [weak self] in
      for await verification in Transaction.updates {
        guard !Task.isCancelled else { return }
        guard case .verified(let transaction) = verification,
              let payload = self?.transactionPayload(transaction) else {
          continue
        }
        self?.transactionUpdates.append(payload)
      }
    }
  }

  private func currentPremiumTransactions() async throws -> [[String: Any]] {
    var payloads: [[String: Any]] = []
    var foundUnverifiedPremium = false
    for await verification in Transaction.currentEntitlements {
      switch verification {
      case .verified(let transaction):
        guard transaction.productID == Self.premiumProductID else { continue }
        guard let payload = transactionPayload(transaction) else {
          throw StoreValidationError.invalidTransaction
        }
        payloads.append(payload)
      case .unverified(let transaction, _):
        if transaction.productID == Self.premiumProductID {
          foundUnverifiedPremium = true
        }
      }
    }
    if foundUnverifiedPremium {
      throw StoreValidationError.unverifiedTransaction
    }
    return payloads
  }

  private func transactionPayload(_ transaction: Transaction) -> [String: Any]? {
    guard transaction.productID == Self.premiumProductID,
          transaction.productType == .nonConsumable,
          transaction.appBundleID == Bundle.main.bundleIdentifier,
          transaction.id > 0,
          transaction.originalID > 0,
          isAcceptedEnvironment(transaction.environmentStringRepresentation) else {
      return nil
    }
    let credential = String(transaction.id)
    transactionsByCredential[credential] = transaction
    return [
      "productId": Self.premiumProductID,
      "platform": "ios",
      "transactionId": credential,
      "completionCredential": credential,
      "originalTransactionId": String(transaction.originalID),
      "purchasedAtEpochMs": transaction.purchaseDate.timeIntervalSince1970 * 1_000,
      "verifiedAtEpochMs": Date().timeIntervalSince1970 * 1_000,
      "status": transaction.revocationDate == nil ? "active" : "revoked",
      "verification": "platform_verified",
    ]
  }

  private func isAcceptedEnvironment(_ environment: String) -> Bool {
    ["production", "sandbox", "xcode"].contains(environment.lowercased())
  }

  private func resultPayload(_ error: Error) -> [String: Any] {
    if let storeError = error as? StoreKitError,
       case .userCancelled = storeError {
      return ["status": "cancelled"]
    }
    let code = errorCode(error)
    if code == "E_STORE_OFFLINE" {
      return unavailable("offline")
    }
    if error is StoreValidationError {
      return failed(code)
    }
    return unavailable("store_unavailable")
  }

  private func errorCode(_ error: Error) -> String {
    if error is StoreValidationError { return "E_INVALID_TRANSACTION" }
    if let storeError = error as? StoreKitError,
       case .networkError = storeError {
      return "E_STORE_OFFLINE"
    }
    let nsError = error as NSError
    if nsError.domain == NSURLErrorDomain { return "E_STORE_OFFLINE" }
    return "E_STORE_UNAVAILABLE"
  }

  private func unavailable(_ reason: String) -> [String: Any] {
    ["status": "unavailable", "reason": reason]
  }

  private func failed(_ errorCode: String) -> [String: Any] {
    ["status": "failed", "errorCode": errorCode]
  }

  private func jsonString(_ value: Any) -> String? {
    guard JSONSerialization.isValidJSONObject(value),
          let data = try? JSONSerialization.data(withJSONObject: value) else {
      return nil
    }
    return String(data: data, encoding: .utf8)
  }

  private enum StoreValidationError: Error {
    case invalidTransaction
    case unverifiedTransaction
  }
}
