# Ham2K Portable Logger - PoLo

The fastest, easiest, bestest way to log your amateur radio operations on the go.

### Our Community

* [Forums](https://forums.ham2k.com) - Please use our forums to report bugs, suggestions and issues in general.

* [Discord](https://discord.gg/rT6B2fP7pU) - Come here for casual discussions, development help and to share your operation photos and videos.

* [Instagram](https://www.instagram.com/ham2kapps/) - Photos and Videos of Ham2K apps in use out in the real world.

* [Documentation](https://polo.ham2k.com/docs/) - Read The Fine Manual

# Install Links

### Official Releases
[![Google Play](https://polo.ham2k.com/google-play-badge-100.png)](https://play.google.com/store/apps/details?id=com.ham2k.polo.beta)
[![AppStore](https://polo.ham2k.com/apple-appstore-badge-100.png)](https://apps.apple.com/us/app/ham2k-portable-logger/id6478713938)

* Android - [Google Play](https://play.google.com/store/apps/details?id=com.ham2k.polo.beta)
* iOS - [AppStore](https://apps.apple.com/us/app/ham2k-portable-logger/id6478713938)

### Test Releases
* Android - [Beta Testing](https://play.google.com/apps/testing/com.ham2k.polo.beta) via Google Play testing
* iOS - [Beta Testing](https://testflight.apple.com/join/TjRq5t5Y) via TestFlight

This app is Open Source and licensed under the [Mozilla Public License 2.0](./LICENSE)

---

# Notes for Developers

## Development Environment

First, complete the [React Native - Environment Setup](https://reactnative.dev/docs/set-up-your-environment) instructions.

Then clone this repository, `cd` into it and install the dependencies:

```
npm install
```

### Maps

In order to use Mapbox maps in your local builds, you need to:

1. Signup for a Mapbox account
2. Create an access token with `downloads:read` scope
3. Save the access token to `.env` as `MAPBOX_ACCESS_TOKEN`

### Build
And finally, build the app for your target platform:

```
# iOS
(cd ios && pod install)
npm run ios

# Android
npm run android
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
* Go to [AppIcon](https://www.appicon.co/#image-sets) > Image Sets, upload the image, generate and download the image set
* On `android/app/src/main/res` replace `launch_screen` in each subdirectory.
* On `ios/polo/Images.xcassets/LaunchScreen.imageset` replace the three versions of `launch_screen`
* On `src/screens/StartScreen/img` replace the three versions of `launch_screen`.


---

# Known Issues

# Troubleshooting

### Clean Build
```
# For all platforms
rm -rf node_modules
npm install

# For android
rm -rf android/app/.cxx
rm -rf android/build
(cd android && ./gradlew clean)

# For iOS
rm -rf ~/Library/Caches/CocoaPods
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf ios/build
(cd ios && pod install)

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
