import React, { useMemo } from 'react'

import Markdown from 'react-native-markdown-display'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function Ham2KMarkdown ({ children, style }) {
  const styles = useThemedStyles()

  const markdownStyles = useMemo(() => {
    return {
      body: { ...style },
      code_inline: { ...style, ...styles.text.callsign, backgroundColor: false }
    }
  }, [style, styles])

  return <Markdown style={markdownStyles}>{children.join('')}</Markdown>
}
