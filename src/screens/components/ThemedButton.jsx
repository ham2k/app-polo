import React from 'react'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { Button } from 'react-native-paper'

function prepareStyles (baseTheme, themeColor) {
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: baseTheme.colors[themeColor],
      onPrimary: baseTheme.colors[`on${upcasedThemeColor}`],
      onSurfaceDisabled: baseTheme.colors[themeColor],
      outline: baseTheme.colors[themeColor]
    }
  }
}

export default function ThemedButton (props) {
  const {
    themeColor = 'primary'
  } = props

  const themeStyles = useThemedStyles(prepareStyles, themeColor)

  return (
    <Button
      {...props}
      theme={themeStyles}
    />
  )
}
