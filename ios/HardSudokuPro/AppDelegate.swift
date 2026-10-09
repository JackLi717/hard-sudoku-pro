import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import StoreKit

@objc(HSPStoreMarketReader)
class HSPStoreMarketReader: NSObject {
  @objc(currentCountryCode:)
  static func currentCountryCode(completion: @escaping (String?) -> Void) {
    Task { @MainActor in
      completion(await Storefront.current?.countryCode)
    }
  }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    if ProcessInfo.processInfo.isiOSAppOnMac {
      return .all
    }
    return .portrait
  }

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "HardSudokuPro",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func createRootViewController() -> UIViewController {
    HardwareInputViewController()
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

class HardwareInputViewController: UIViewController {
  private var hardwareInputEnabled = false

  override func viewDidLoad() {
    super.viewDidLoad()
    NotificationCenter.default.addObserver(
      self, selector: #selector(updateHardwareInput(_:)),
      name: NSNotification.Name("HSPHardwareInputEnabled"), object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc private func updateHardwareInput(_ notification: Notification) {
    hardwareInputEnabled = notification.userInfo?["enabled"] as? Bool ?? false
    UIMenuSystem.main.setNeedsRebuild()
  }

  override var keyCommands: [UIKeyCommand]? {
    guard hardwareInputEnabled, !UIAccessibility.isVoiceOverRunning else { return nil }
    let inputs = (0...9).map(String.init) + [
      UIKeyCommand.inputUpArrow, UIKeyCommand.inputDownArrow,
      UIKeyCommand.inputLeftArrow, UIKeyCommand.inputRightArrow,
      "\u{8}", "\u{7f}", "n", "h", "p",
    ]
    var commands = inputs.map {
      UIKeyCommand(input: $0, modifierFlags: [], action: #selector(hardwareKey(_:)))
    }
    commands += [UIKeyModifierFlags.command, .control].map {
      UIKeyCommand(input: "z", modifierFlags: $0, action: #selector(hardwareKey(_:)))
    }
    commands.forEach { $0.wantsPriorityOverSystemBehavior = true }
    return commands
  }

  @objc private func hardwareKey(_ command: UIKeyCommand) {
    guard hardwareInputEnabled, let input = command.input else { return }
    let names = [
      UIKeyCommand.inputUpArrow: "ArrowUp", UIKeyCommand.inputDownArrow: "ArrowDown",
      UIKeyCommand.inputLeftArrow: "ArrowLeft", UIKeyCommand.inputRightArrow: "ArrowRight",
      "\u{8}": "Backspace", "\u{7f}": "Delete",
    ]
    NotificationCenter.default.post(
      name: NSNotification.Name("HSPHardwareKey"), object: nil,
      userInfo: [
        "key": names[input] ?? input,
        "control": command.modifierFlags.contains(.control),
        "meta": command.modifierFlags.contains(.command),
        "alt": command.modifierFlags.contains(.alternate),
        "shift": command.modifierFlags.contains(.shift),
      ]
    )
  }
}
