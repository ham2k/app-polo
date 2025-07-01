/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import Markdown from 'react-native-markdown-display'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

/*
 * For more styling info, see
 *  - https://www.npmjs.com/package/react-native-markdown-display#rules-and-styles
 *  - https://github.com/iamacup/react-native-markdown-display/blob/master/src/lib/styles.js
 *
 */

export function Ham2kMarkdown ({ children, styles, style, compact }) {
  const defaultStyles = useThemedStyles()
  const markdownStyle = useMemo(() => {
    const combinedStyle = { ...defaultStyles?.markdown, ...styles?.markdown }
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
    return combinedStyle
  }, [styles, style, defaultStyles, compact])

  if (children?.join) children = children.join('')
  if (children) return <Markdown style={markdownStyle}>{children}</Markdown>
}
