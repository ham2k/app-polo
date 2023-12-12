module.exports = {
  root: true,
  extends: ['@react-native', 'standard'],
  overrides: [],
  rules: {
    'prettier/prettier': 0,
    'react/jsx-indent': [2, 2, { checkAttributes: false, indentLogicalExpressions: true }],
    'react/jsx-indent-props': [2, 2],
    'react/jsx-closing-bracket-location': [2, 'tag-aligned'],
    // 'react/max-props-per-line': [1, { maximum: { single: 3, multi: 1 } }],
    'react/prop-types': 'off',
    'react-native/no-inline-styles': 'off',
    'no-debugger': 'warn',
    'multiline-ternary': 'off'
  }
}
