
# Links:

* Tester Group: https://groups.google.com/g/ham2k-polo-testers
* Discord: https://discord.gg/rT6B2fP7pU
* Android Internal: https://play.google.com/apps/internaltest/4700998652811571052
* Android Closed Beta: https://play.google.com/apps/testing/com.ham2k.polo.beta
* TestFlight: https://testflight.apple.com/join/TjRq5t5Y

# Debug Menu

iOS: Cmd ⌘ + D

Android: Cmd ⌘ + M (macOS) or Ctrl + M (Windows and Linux)

# Resources

Icons from https://pictogrammers.com/library/mdi/

# Access iOS Simulator Info

https://www.iosdev.recipes/simctl/

```
xcrun simctl
xcrun simctl listapps booted # List all apps
```

# Local path for PoLo's internal files

```
open `xcrun simctl get_app_container booted com.ham2k.polo data`/Documents
```

# Local path where files are saved when exporting and "Save To Files"

```
open `xcrun simctl get_app_container booted com.apple.DocumentsApp groups |grep FileProvider.LocalStorage|sed "s/group.com.apple.FileProvider.LocalStorage//g"`/File\ Provider\ Storage
```

---

# Troubleshooting

###
```
npm start -- --reset-cache
```

```
cd android && ./gradlew clean && ./gradlew cleanBuildCache && cd ..
```

### "Unable to boot simulator" error for iOS Simulator

* Go to [About this Mac > Storage > Manage > Developer]
* Delete XCode caches

https://github.com/shinydevelopment/SimulatorStatusMagic

### Some troubleshooting links

React Native [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

---

# Release Flow

### First, open a new release
* Update version in `package.json` and add a heading on `RELEASE NOTES.md`
* Commit to `main` as "Open {version}"

### Then, write code, commit, merge, push, test, etc
* Update `RELEASE NOTES.md` as you go

### When ready to build a release

#### Android
* Update version and build number in `android/app/build.gradle`
* Run `npm run build:android:beta:release`
* Fetch binary from `android/app/build/outputs/bundle`

#### iOS
* In `ios/Polo/Info.plist`, remove `localhost` from `NSExceptionDomains`
* Update version and build number in XCode > Targets: Polo > Build Settings > Versioning
* Also in XCode: Product > Scheme > polo-Prod
* Also in XCode: Product > Scheme > Edit Scheme > polo-Prod > Run > Build Configuration: Release
* Also in XCode: Product > Archive
* In Archive: Distribute App
* Revert changes to `Info.plist`

### Finally, close the release

* Commit to `main` as `Release {version}`. Should only contain the changes to android and ios files described above.

-------------

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
