module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '^@ham2k/lib-maidenhead-grid$': '<rootDir>/node_modules/@ham2k/lib-maidenhead-grid/dist/index.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@ham2k/lib-maidenhead-grid)/)'
  ]
}
