# Main Releases
```
npm install
cd ios && pod install && cd ..
```

# Supplemental Updates (OTA CodePush)

```
BASE_VERSION=0.4.10
npm install

appcenter codepush release-react -a Ham2K/polo-android -d Staging -t $BASE_VERSION
appcenter codepush release-react -a Ham2K/polo-ios -d Staging -t $BASE_VERSION
```
