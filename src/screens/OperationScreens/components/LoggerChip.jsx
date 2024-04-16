/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'

import { Chip } from 'react-native-paper'

export default function LoggerChip ({
  children,
  icon,
  styles, style, themeColor, textStyle,
  selected,
  disabled,
  onChange
}) {
  themeColor = themeColor ?? 'primary'

  const handlePress = useCallback(() => {
    onChange && onChange(!selected)
  }, [selected, onChange])

  const { colorizedTheme, baseTextStyle, mode } = useMemo(() => {
    const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
    let colorizedTheme, baseTextStyle, mode // eslint-disable-line no-shadow

    mode = 'flat'
    if (disabled) {
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
    } else if (selected) {
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
        color: styles.theme.colors[`on${upcasedThemeColor}`]
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
  }, [themeColor, styles, selected, disabled])

  return (
    <Chip
      icon={icon}
      mode={mode}
      theme={colorizedTheme}
      style={[style]}
      textStyle={[baseTextStyle, textStyle]}
      disabled={disabled}
      onPress={handlePress}
    >
      {children}
    </Chip>

  )
}
