# Release Channels

(NOTE, these release notes are a work in progress, not the current reality)

### Android - Unstable: `com.ham2k.polo.beta`

"Internal Testing" channel in Google Play Console
  Private list
  https://play.google.com/apps/internaltest/4700998652811571052

"Closed Testing" channel in Google Play Console
  Limited to members of https://groups.google.com/g/ham2k-polo-testers/

"Production" channel in Google Play Console
  Soon to be shut down

### Android - Production: `com.ham2k.polo.prod`

"Internal Testing" channel in Google Play Console
  Private list

"Open Testing" channel in Google Play Console

"Production" channel in Google Play Console


### Migration Plan

* [ ] Build mechanism to export data from `beta` to `prod`
        Link from one app to the other, passing a token, uploading QSON from one app, downloading it on the other app
* [ ] Build mechanism to detect that user has `beta` version installed and prompt to install `prod` version
* [ ] Add a new startup image for `beta` version
* [ ] Android: release `prod` version, similar to `beta`
* [ ] Android: release `beta` version with prompts
* [ ] Android: stop `beta` production version
  Advanced Settings > App Availability > Unpublished




### iOS - Alpha
### iOS - Beta
### iOS - Production



# Dist setup

```
npm install -g appcenter-cli
```

# Open a new version

* Update version in `package.json`
* Add a new entry in `RELEASE-NOTES.json`

# Main Releases

* Update base version and build number in `.env`
* ~Update version and build number in `android/app/build.gradle`~
* ~In `ios/Polo/Info.plist`, remove `localhost` from `NSExceptionDomains`~
* ~Update version (`MARKETING_VERSION`) and build number (`CURRENT_PROJECT_VERSION`) in `project.pbxproj` or in XCode > Targets: Polo > Build Settings > Versioning~

* In XCode, check: Product > Scheme > polo-Prod
* In XCode, check: Product > Scheme > Edit Scheme > polo-Prod > Run > Build Configuration: Release

```
npm install
cd ios && pod install && cd ..
npm run build:android:beta:release
```

* In XCode: Product > Archive
* In Archive: Distribute App

* Commit file changes and tag as `0.4.0-core`

* Announce in Discord #polo-releases
* Send email to testers

### Generate APKs

As seen [here](https://proandroiddev.com/how-to-create-an-apk-from-the-android-app-bundle-d913429d43a)

```
brew install bundletool
cd android/app/build/outputs/betaRelease
bundletool build-apks --bundle=android/app/build/outputs/bundle/betaRelease/com.ham2k.polo-v${POLO_BUILD}\(${POLO_BASE_VERSION}\)-beta-release.aab --output=com.ham2k.polo-v${POLO_BUILD}\(${POLO_BASE_VERSION}\)-beta-release.apk
```

``````

```bundletool install-apks --apks=polo.apks```

---

# Supplemental Updates (OTA CodePush)

```
BASE_VERSION=0.4.10
ENVFILE=.distribution.env
npm install

appcenter codepush release-react -a Ham2K/polo-android -d Staging -t $BASE_VERSION
appcenter codepush release-react -a Ham2K/polo-ios -d Staging -t $BASE_VERSION
```

* Commit file changes (if any) and tag as `0.4.0-bundle`

* Announce in Discord #polo-releases
* Send email to testers
