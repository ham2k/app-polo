# Open a new version

* Update version in `package.json`
* Add a new entry in `RELEASE-NOTES.json`

# Main Releases

* Update version and build number in `android/app/build.gradle`
* In `ios/Polo/Info.plist`, remove `localhost` from `NSExceptionDomains`
* Update version (`MARKETING_VERSION`) and build number (`CURRENT_PROJECT_VERSION`) in `project.pbxproj` or in XCode > Targets: Polo > Build Settings > Versioning

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

---

# Supplemental Updates (OTA CodePush)

```
BASE_VERSION=0.4.10
npm install

appcenter codepush release-react -a Ham2K/polo-android -d Staging -t $BASE_VERSION
appcenter codepush release-react -a Ham2K/polo-ios -d Staging -t $BASE_VERSION
```

* Commit file changes (if any) and tag as `0.4.0-bundle`

* Announce in Discord #polo-releases
* Send email to testers
