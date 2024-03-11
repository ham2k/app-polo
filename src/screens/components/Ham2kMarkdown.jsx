import React from 'react'

import Markdown from 'react-native-markdown-display'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function Ham2kMarkdown ({ children, style }) {
  const styles = useThemedStyles()

  if (children.join) children = children.join('')

  if (children) return <Markdown style={styles.markdown}>{children}</Markdown>
}
