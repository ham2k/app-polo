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
# you might need to also run `npm install redux-persist` if you get errors about missing modules
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

# Translations

Environment setup:
```
$ brew tap crowdin/crowdin && brew install crowdin
```

Update CrowdIn with base English translations:
```
$ crowdin push sources
```

Fetch updated translations from CrowdIn:
```
$ crowdin pull translations
```

## Notes on translation strings:

* keys that end in `-md` are meant to be used with Markdown formatting.
* keys that end in `-a11y` are meant to be used for accessibility labels, to be spoken aloud.
* keys that end in `_zero`, `_one`, `_other` are meant to be used with pluralization.

## Testing in-app

In CrowdIn, create a "personal access token" at https://crowdin.com/settings#api-key

In PoLo, enable Developer Mode and in the Developer Settings screen, enter that personal token into the "CrowdIn API Key" field.

Then on the Quick Lookup field in the home screen, enter "CROWDIN" and press enter. This will refresh the current language in the app, and also fetch the list of all languages available in CrowdIn. After changing languages, and any time you reopen the app, you can enter "CROWDIN" again to fetch the latest version of the translations from CrowdIn.

---

# Known Issues

# Troubleshooting

### Clean Build
```
npm run clean:js  # wipe node_modules and reinstall
npm run clean:android  # wipe android build and gradle caches
npm run clean:ios  # wipe ios build and cocoapods caches, reinstall pods
npm run clean:watchman  # wipe watchman caches

# or

npm run clean:all  # wipe all caches and reinstall

# and then

npm start -- --reset-cache
npm run ios
npm run android
```

### "Unable to boot simulator" error for iOS Simulator

* Go to [About this Mac > Storage > Manage > Developer]
* Delete XCode caches

https://github.com/shinydevelopment/SimulatorStatusMagic



### "unable to resolve module redux-persist/integration/react"

For some reason, sometimes the `redux-persist` does not install correctly
the first time, so you need to run `npm install redux-persist` manually.


### Some troubleshooting links

React Native [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.
