const { withRozenite } = require('@rozenite/metro')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    unstable_allowRequireContext: true
  }
}

module.exports = (
  withRozenite(
    mergeConfig(getDefaultConfig(__dirname), config), {
    enabled: process.env.WITH_ROZENITE === 'true'
  })
)
