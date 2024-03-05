import React, { useMemo } from 'react'

import Markdown from 'react-native-markdown-display'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function Ham2kMarkdown ({ children, style }) {
  const styles = useThemedStyles()

  const markdownStyles = useMemo(() => {
    return {
      body: { ...style },
      code_inline: { ...style, ...styles.text.callsign, backgroundColor: false }
    }
  }, [style, styles])

  if (children.join) children = children.join('')

  if (children) return <Markdown style={markdownStyles}>{children}</Markdown>
}
