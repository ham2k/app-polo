import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactNative from "eslint-plugin-react-native";

export default defineConfig([
  js.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    ignores: ["node_modules/**", "android/**", "ios/**", "build/**", "dist/**"],
  },
  {
    plugins: {
      "react": pluginReact,
      "react-hooks": pluginReactHooks,
      "react-native": pluginReactNative,
    },
    languageOptions: {
      globals: {
        ...pluginReactNative.environments["react-native"].globals,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        }
      }
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      "prettier/prettier": 0,

      "react/jsx-indent": [2, 2, {
        checkAttributes: false,
        indentLogicalExpressions: true,
      }],

      "react/jsx-indent-props": [2, 2],
      "react/jsx-closing-bracket-location": [2, "tag-aligned"],
      "react/prop-types": "off",
      "react-native/no-inline-styles": "off",
      "no-debugger": "warn",
      "multiline-ternary": "off",
    },
  }
]);
