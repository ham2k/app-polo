import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import react_native_splash_screen

@main
class AppDelegate: UIResponder, UIApplicationDelegate, RNAppAuthAuthorizationFlowManager {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

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
      withModuleName: "polo",
      in: window,
      launchOptions: launchOptions
    )

    react_native_splash_screen.RNSplashScreen.show()

    return true
  }

  // "open url" delegate function, for deeplinks like com.ham2k.polo://qso?... or com.ham2k.polo.auth://sota (using react-native-app-auth)
  public weak var authorizationFlowManagerDelegate: RNAppAuthAuthorizationFlowManagerDelegate?
  func application(
    _ application: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if let delegate = authorizationFlowManagerDelegate,
      delegate.resumeExternalUserAgentFlow(with: url)
    {
      return true
    }
    return RCTLinkingManager.application(application, open: url, options: options)
  }



  // func application(
  //   _ application: UIApplication,
  //   continue userActivity: NSUserActivity,
  //   restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  // ) -> Bool {

  //   // Handle Universal-Link–style OAuth redirects first
  //   if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
  //     let delegate = authorizationFlowManagerDelegate,
  //     delegate.resumeExternalUserAgentFlow(with: userActivity.webpageURL)
  //   {
  //     return true
  //   }

  //   // Fall back to React Native’s own Linking logic
  //   return RCTLinkingManager.application(
  //     application,
  //     continue: userActivity,
  //     restorationHandler: restorationHandler
  //   )
  // }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
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
