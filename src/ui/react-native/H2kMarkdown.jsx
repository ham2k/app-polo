/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import Markdown from 'react-native-markdown-display'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { StyleSheet } from 'react-native'

/*
 * For more styling info, see
 *  - https://www.npmjs.com/package/react-native-markdown-display#rules-and-styles
 *  - https://github.com/iamacup/react-native-markdown-display/blob/master/src/lib/styles.js
 *
 */

export function H2kMarkdown ({ children, styles, style, compact }) {
  const defaultStyles = useThemedStyles()
  // Ensure style is a single object even if passed as an array
  style = StyleSheet.flatten(style)

  const markdownStyle = useMemo(() => {
    let combinedStyle = { ...defaultStyles?.markdown, ...styles?.markdown }
    if (style) combinedStyle.body = { ...combinedStyle?.body, ...style }
    if (compact) {
      combinedStyle.paragraph = {
        ...combinedStyle?.paragraph,
        padding: styles?.markdown?.paragraph?.padding ?? 0,
        margin: styles?.markdown?.paragraph?.margin ?? 0,
        marginTop: styles?.markdown?.paragraph?.marginTop ?? 0,
        marginBottom: styles?.markdown?.paragraph?.marginBottom ?? 0,
        paddingTop: styles?.markdown?.paragraph?.paddingTopx ?? 0,
        paddingBottom: styles?.markdown?.paragraph?.paddingBottom ?? 0
      }
      combinedStyle.body = {
        ...combinedStyle?.body,
        paddingTop: style.paddingTop ?? 0,
        paddingBottom: style.paddingBottom ?? 0,
        marginTop: style.marginTop ?? 0,
        marginBottom: style.marginBottom ?? 0
      }
    }
    if (style?.color) combinedStyle = _recursivelyReplace(combinedStyle, { color: style.color })
    return combinedStyle
  }, [styles, style, defaultStyles, compact])

  if (children?.join) children = children.join('')
  if (children) return <Markdown style={markdownStyle}>{children}</Markdown>
}

function _recursivelyReplace (obj, replacement) {
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      for (const [replacementKey, replacementValue] of Object.entries(replacement)) {
        if (key === replacementKey) {
          obj[key] = replacementValue
        }
      }
      if (typeof value === 'object') {
        obj[key] = _recursivelyReplace(value, replacement)
      }
    }
  }
  return obj
}
