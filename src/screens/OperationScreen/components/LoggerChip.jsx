import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { Chip } from 'react-native-paper'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

export default function LoggerChip ({ children, icon, style, baseColor }) {
  const themeStyles = useThemedStyles()

  const [selected, setSelected] = useState(false)

  baseColor = baseColor ?? 'primary'

  const handlePress = useCallback(() => {
    setSelected(!selected)
  }, [setSelected, selected])

  const { colorizedTheme, textStyle, mode } = useMemo(() => {
    const upcasedBaseColor = baseColor.charAt(0).toUpperCase() + baseColor.slice(1)
    let colorizedTheme, textStyle, mode // eslint-disable-line no-shadow

    if (selected) {
      mode = 'flat'
      colorizedTheme = {
        colors: {
          primary: themeStyles.theme.colors[`on${upcasedBaseColor}`],
          onPrimary: themeStyles.theme.colors[baseColor],
          primaryContainer: themeStyles.theme.colors[`${baseColor}Container`],
          onPrimaryContainer: themeStyles.theme.colors[`on${upcasedBaseColor}Container`],
          secondaryContainer: themeStyles.theme.colors[baseColor],
          onSecondaryContainer: themeStyles.theme.colors[`on${upcasedBaseColor}`]
        }
      }
      textStyle = {
        color: themeStyles.theme.colors[`on${upcasedBaseColor}`],
        padding: 1 // Compensate for 'outlined' borders
      }
    } else {
      mode = 'outlined'
      colorizedTheme = {
        colors: {
          primary: themeStyles.theme.colors[baseColor],
          onPrimary: themeStyles.theme.colors[`on${upcasedBaseColor}`],
          primaryContainer: themeStyles.theme.colors[`${baseColor}Container`],
          onPrimaryContainer: themeStyles.theme.colors[`on${upcasedBaseColor}Container`],
          secondaryContainer: themeStyles.theme.colors[baseColor],
          onSecondaryContainer: themeStyles.theme.colors[`on${upcasedBaseColor}`],
          // surface: '#ff0000',
          onSurface: themeStyles.theme.colors[`on${upcasedBaseColor}Container`],
          outline: themeStyles.theme.colors[baseColor]
        }
      }
      textStyle = {
        color: themeStyles.theme.colors[baseColor]
      }
    }
    return { mode, colorizedTheme, textStyle }
  }, [baseColor, themeStyles, selected])

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
