import React from 'react'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { Button } from 'react-native-paper'

import Color from 'color'

export default function ThemedButton (props) {
  const {
    themeColor = 'primary'
  } = props

  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)

  const themeStyles = useThemedStyles(baseTheme => {
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
  })

  return (
    <Button
      {...props}
      theme={themeStyles}
    />
  )
}
