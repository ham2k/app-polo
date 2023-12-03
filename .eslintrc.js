module.exports = {
  root: true,
  extends: ['@react-native', 'standard'],
  overrides: [],
  rules: {
    'prettier/prettier': 0,
    'react/jsx-indent': [2, 2, { checkAttributes: false, indentLogicalExpressions: true }],
    'react/prop-types': 'off',
    'no-debugger': 'warn',
    'multiline-ternary': 'off'
  }
}
