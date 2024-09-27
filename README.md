# Ham2K Portable Logger - PoLo

An app for Amateur Radio operations.

### Our Community

* [Discord](https://discord.gg/rT6B2fP7pU)
* [Google Groups - PoLo Testers](https://groups.google.com/g/ham2k-polo)

### Install Links

* Android - [Play Store](https://play.google.com/store/apps/details?id=com.ham2k.polo.beta)
* Android - [Beta Testing](https://play.google.com/apps/testing/com.ham2k.polo.beta)
* iOS - App Store (coming soon)
* iOS - [Beta Testing](https://testflight.apple.com/join/TjRq5t5Y)

This app is Open Source and licensed under the [Mozilla Public License 2.0](./LICENSE)

---

# Notes for Developers

## Development Environment

First, complete the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions up to just before "Creating a new application" step.

Then clone this repository and install the dependencies:

```
npm install
```

And finally, build the app for your target platform:

```
# iOS
(cd ios && pod install)
npm run ios

# Android
npm run android -- --mode alphaDebug
```
### Debug Menu

iOS: Cmd ⌘ + D

Android: Cmd ⌘ + M (macOS) or Ctrl + M (Windows and Linux)

### Resources

Icons from https://pictogrammers.com/library/mdi/

Tools
* https://icon.kitchen/

### Access iOS Simulator Info

https://www.iosdev.recipes/simctl/

```
xcrun simctl
xcrun simctl listapps booted # List all apps
```

### Local path for PoLo's internal files

```
open `xcrun simctl get_app_container booted com.ham2k.polo data`/Documents
```

### Local path where files are saved when exporting and "Save To Files"

```
open `xcrun simctl get_app_container booted com.apple.DocumentsApp groups |grep FileProvider.LocalStorage|sed "s/group.com.apple.FileProvider.LocalStorage//g"`/File\ Provider\ Storage
```

### Updating the splash screen

* Start with a 2048x2048 image.
  * https://firefly.adobe.com/
  * https://app.leonardo.ai/image-generation

* Go to [AppIcon](https://www.appicon.co/#image-sets) > Image Sets, upload the image, generate and download the image set
* On `android/app/src/main/res` replace `launch_screen` in each subdirectory.
* On `ios/polo/Images.xcassets/LaunchScreen.imageset` replace the three versions of `launch_screen`
* On `src/screens/StartScreen/img` replace the three versions of `launch_screen`.

---

# Known Issues

### Android builds from the metro bundler terminal

Because of a mess with our multiple build flavors, under RN 0.73 the default way of running android for development is broken
so you cannot just press `a` from the metro bundler terminal to run the app on android.

Instead, run the metro bundler (`npm start`) on one terminal, and run `npm run android` on another to build the app.

Afterwards, just press `r` on the metro bundler terminal to reload the app.



# Troubleshooting

### Clean Build
```
# For all platforms
rm -rf node_modules
npm install

# For android
rm -rf android/app/.cxx
(cd android && ./gradlew clean)

# For iOS
rm -rf ~/Library/Caches/CocoaPods
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf ios/build
(cd ios && RCT_NEW_ARCH_ENABLED=1 pod install)

# For all platforms
watchman watch-del .
watchman watch-project .
npm start -- --reset-cache
```

### "Unable to boot simulator" error for iOS Simulator

* Go to [About this Mac > Storage > Manage > Developer]
* Delete XCode caches

https://github.com/shinydevelopment/SimulatorStatusMagic

### Some troubleshooting links

React Native [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

---

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
