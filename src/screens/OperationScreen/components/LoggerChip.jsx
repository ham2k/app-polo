import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { Chip } from 'react-native-paper'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

export default function LoggerChip ({ children, icon, style, themeColor }) {
  const themeStyles = useThemedStyles()

  const [selected, setSelected] = useState(false)

  themeColor = themeColor ?? 'primary'

  const handlePress = useCallback(() => {
    setSelected(!selected)
  }, [setSelected, selected])

  const { colorizedTheme, textStyle, mode } = useMemo(() => {
    const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
    let colorizedTheme, textStyle, mode // eslint-disable-line no-shadow

    if (selected) {
      mode = 'flat'
      colorizedTheme = {
        colors: {
          primary: themeStyles.theme.colors[`on${upcasedThemeColor}`],
          onPrimary: themeStyles.theme.colors[themeColor],
          primaryContainer: themeStyles.theme.colors[`${themeColor}Container`],
          onPrimaryContainer: themeStyles.theme.colors[`on${upcasedThemeColor}Container`],
          secondaryContainer: themeStyles.theme.colors[themeColor],
          onSecondaryContainer: themeStyles.theme.colors[`on${upcasedThemeColor}`]
        }
      }
      textStyle = {
        color: themeStyles.theme.colors[`on${upcasedThemeColor}`] // `on${upcasedThemeColor}`],
      }
    } else {
      mode = 'flat'
      colorizedTheme = {
        colors: {
          primary: themeStyles.theme.colors[`on${upcasedThemeColor}Container`],
          onPrimary: themeStyles.theme.colors[themeColor],
          primaryContainer: themeStyles.theme.colors[`${themeColor}Container`],
          onPrimaryContainer: themeStyles.theme.colors[`on${upcasedThemeColor}Container`],
          secondaryContainer: themeStyles.theme.colors[`${themeColor}Light`],
          onSecondaryContainer: themeStyles.theme.colors[`on${upcasedThemeColor}`]
        }
      }
      textStyle = {
        color: themeStyles.theme.colors[`on${upcasedThemeColor}Container`]
      }
    }
    return { mode, colorizedTheme, textStyle }
  }, [themeColor, themeStyles, selected])

  return (
    <Chip
      icon={icon}
      mode={mode}
      theme={colorizedTheme}
      textStyle={textStyle}
      onPress={handlePress}
    >
      {children}
    </Chip>

  )
}
