module.exports = {
  project: {
    android: {
      unstable_reactLegacyComponentNames: ['AIRGoogleMap', 'AIRMap', 'AIRMapMarker', 'PanoramaView']
    },
    ios: {
      unstable_reactLegacyComponentNames: ['AIRGoogleMap', 'AIRMap', 'AIRMapMarker', 'PanoramaView']
    }
  },
  assets: ['./assets/fonts']
}

// Run `npx react-native-asset` after adding assets
