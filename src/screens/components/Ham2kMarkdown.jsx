import React from 'react'

import Markdown from 'react-native-markdown-display'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function Ham2kMarkdown ({ children, styles }) {
  const defaultStyles = useThemedStyles()
  const style = styles?.markdown ?? defaultStyles?.markdown

  if (children.join) children = children.join('')

  if (children) return <Markdown style={style}>{children}</Markdown>
}
