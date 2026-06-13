// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

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
      onSurfaceDisabled: baseTheme.colors.onSurfaceDisabled,
      outline: baseTheme.colors[themeColor]
    }
  }
}

export function H2kButton (props) {
  const {
    theme,
    themeColor = 'primary'
  } = props

  const themeStyles = useThemedStyles(prepareStyles, themeColor)

  return (
    <Button
      {...props}
      theme={theme ?? themeStyles}
    />
  )
}
