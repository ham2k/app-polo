import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { Chip } from 'react-native-paper'

export default function LoggerChip ({
  children,
  icon,
  styles, style, themeColor, textStyle,
  selected: initialSelected,
  onChange
}) {
  const [selected, setSelected] = useState(initialSelected)

  useEffect(() => {
    setSelected(initialSelected)
  }, [initialSelected])

  themeColor = themeColor ?? 'primary'

  const handlePress = useCallback(() => {
    setSelected(!selected)
    onChange && onChange(!selected)
  }, [setSelected, selected, onChange])

  const { colorizedTheme, baseTextStyle, mode } = useMemo(() => {
    const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
    let colorizedTheme, baseTextStyle, mode // eslint-disable-line no-shadow

    if (selected) {
      mode = 'flat'
      colorizedTheme = {
        colors: {
          primary: styles.theme.colors[`on${upcasedThemeColor}`],
          onPrimary: styles.theme.colors[themeColor],
          primaryContainer: styles.theme.colors[`${themeColor}Container`],
          onPrimaryContainer: styles.theme.colors[`on${upcasedThemeColor}Container`],
          secondaryContainer: styles.theme.colors[themeColor],
          onSecondaryContainer: styles.theme.colors[`on${upcasedThemeColor}`]
        }
      }
      baseTextStyle = {
        color: styles.theme.colors[`on${upcasedThemeColor}`] // `on${upcasedThemeColor}`],
      }
    } else {
      mode = 'flat'
      colorizedTheme = {
        colors: {
          primary: styles.theme.colors[`on${upcasedThemeColor}Container`],
          onPrimary: styles.theme.colors[themeColor],
          primaryContainer: styles.theme.colors[`${themeColor}Container`],
          onPrimaryContainer: styles.theme.colors[`on${upcasedThemeColor}Container`],
          secondaryContainer: styles.theme.colors[`${themeColor}Light`],
          onSecondaryContainer: styles.theme.colors[`on${upcasedThemeColor}`]
        }
      }
      baseTextStyle = {
        color: styles.theme.colors[`on${upcasedThemeColor}Container`]
      }
    }
    return { mode, colorizedTheme, baseTextStyle }
  }, [themeColor, styles, selected])

  return (
    <Chip
      icon={icon}
      mode={mode}
      theme={colorizedTheme}
      style={[style]}
      textStyle={[baseTextStyle, textStyle]}
      onPress={handlePress}
    >
      {children}
    </Chip>

  )
}
