# Contributing to Ham2K PoLo

Thanks for helping improve PoLo.

## Before You Start

Using `mise` is the easiest way to satisfy some of the local environment setup. Check it out here: https://mise.jdx.dev.

1. Complete the React Native environment setup for your platform:
   https://reactnative.dev/docs/set-up-your-environment
2. Ensure these required tools are available:
   - Xcode + CocoaPods (for iOS work)
   - Android Studio SDK/NDK (for Android work)
   - If not using `mise`, you will have to manually manage these dependencies:
      - Node.js 22
      - Ruby 3.2

## Initial Setup

```bash
# Recommended:
mise install

npm install
bundle install
bundle exec pod install --project-directory=ios
```

This installs:
- npm dependencies
- iOS pods

## Environment Variables

`.env` controls app version/build and API keys.

At minimum, set `MAPBOX_ACCESS_TOKEN`:

```dotenv
MAPBOX_ACCESS_TOKEN=...
```

This token is required for local development, and local native builds need a token with `downloads:read` scope.

Other external services may also need API keys depending on the feature area you are working in.
Use the placeholders in `.env` for:
- `WWFF_API_KEY`
- `LLOTA_API_KEY`
- `TOTA_API_KEY`

## Daily Development

```bash
npm start       # Metro
npm run ios     # iOS simulator
npm run android # Android emulator/device
```

Quality checks:

```bash
npm run lint
npm test
```

If your local environment gets into a bad state:

```bash
npm run clean:all
npm start -- --reset-cache
```

## Debug Menu

- iOS: `Cmd + D`
- Android: `Cmd + M` (macOS) or `Ctrl + M` (Windows/Linux)

## iOS Simulator Tips

- Reference: https://www.iosdev.recipes/simctl/
- `xcrun simctl listapps booted` to list installed simulator apps.
- `open \`xcrun simctl get_app_container booted com.ham2k.polo data\`/Documents` to open PoLo's Documents folder.
- `open \`xcrun simctl get_app_container booted com.apple.DocumentsApp groups |grep FileProvider.LocalStorage|sed "s/group.com.apple.FileProvider.LocalStorage//g"\`/File\ Provider\ Storage` to open simulator Files local storage.

## Resources

- Icons: https://pictogrammers.com/library/mdi/
- Icon tooling: https://icon.kitchen/

## Translations (Crowdin)

Install the CLI:

```bash
brew tap crowdin/crowdin
brew install crowdin
```

Push base English source strings:

```bash
crowdin push sources
```

Pull translated strings:

```bash
crowdin pull translations
```

String suffix conventions:

- `-md` for Markdown-formatted strings
- `-a11y` for spoken accessibility labels
- `_zero`, `_one`, `_other` for pluralization

In-app translation testing:

1. Create a personal access token at https://crowdin.com/settings#api-key
2. In PoLo, enable Developer Mode and set the token in Developer Settings.
3. Enter `CROWDIN` in the home screen quick lookup field to refresh language data.

## Splash Screen Updates

1. Start with a `2048x2048` source image.
2. Generate image sets at https://www.appicon.co/#image-sets
3. Replace `launch_screen` assets in:
   - `android/app/src/main/res/*`
   - `ios/polo/Images.xcassets/LaunchScreen.imageset`
   - `src/screens/StartScreen/img`

## Troubleshooting

### Clean Build

```bash
npm run clean:js
npm run clean:android
npm run clean:ios
npm run clean:watchman

# or
npm run clean:all

# then
npm start -- --reset-cache
npm run ios
npm run android
```

### "Unable to boot simulator" error for iOS Simulator

- Go to `About this Mac > Storage > Manage > Developer`
- Delete Xcode caches
- See: https://github.com/shinydevelopment/SimulatorStatusMagic

### "unable to resolve module redux-persist/integration/react"

If `redux-persist` did not install correctly, run:

```bash
npm install redux-persist
```

### Additional References

- React Native troubleshooting: https://reactnative.dev/docs/troubleshooting

## Pull Requests

1. Keep changes focused and small where possible.
2. Include tests if you can, especially when behavior changes.
3. Run lint/tests before opening a PR.
4. In the PR description, include:
   - What changed
   - Why it changed
   - Any migration or QA notes
