import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import react_native_splash_screen

@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    self.moduleName = "polo"
    self.dependencyProvider = RCTAppDependencyProvider()

    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]


    let ret = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    if ret {
      react_native_splash_screen.RNSplashScreen.show()
    }

    return ret
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

  // "open url" delegate function, for react-native-app-auth
  public weak var authorizationFlowManagerDelegate: RNAppAuthAuthorizationFlowManagerDelegate?
  override func application(
      _ app: UIApplication,
      open url: URL,
      options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
      return authorizationFlowManagerDelegate?.resumeExternalUserAgentFlow(with: url) ?? false
  }
}
