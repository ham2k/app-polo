/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import Markdown from 'react-native-markdown-display'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function Ham2kMarkdown ({ children, styles, style }) {
  const defaultStyles = useThemedStyles()
  const markdownStyle = useMemo(() => {
    const combinedStyle = { ...defaultStyles?.markdown, ...styles?.markdown }
    if (style) combinedStyle.body = { ...combinedStyle?.body, ...style }
    return combinedStyle
  }, [styles, style, defaultStyles])

  if (children.join) children = children.join('')
  if (children) return <Markdown style={markdownStyle}>{children}</Markdown>
}
