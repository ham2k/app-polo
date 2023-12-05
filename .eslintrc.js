module.exports = {
  root: true,
  extends: ['@react-native', 'standard'],
  overrides: [],
  rules: {
    'prettier/prettier': 0,
    'react/jsx-indent': [2, 2],
    'react/prop-types': 'off',
    'react-native/no-inline-styles': 'off',
    'no-debugger': 'warn',
    'multiline-ternary': 'off'
  }
}
