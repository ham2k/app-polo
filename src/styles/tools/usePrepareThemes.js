import { useMemo } from 'react'

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper'

import { useColorScheme } from 'react-native'

import lightColors from '../lightColors'
import darkColors from '../darkColors'
import Color from 'color'

export function usePrepareThemes () {
  const colorScheme = useColorScheme()

  const colors = useMemo(() => {
    const loadedColors = colorScheme === 'dark' ? darkColors.colors : lightColors.colors

    if (colorScheme === 'dark') {
      ['primary', 'secondary', 'tertiary'].forEach((color) => {
        loadedColors[`${color}Light`] = Color(loadedColors[color]).darken(0.5).desaturate(0.4).hex()
        loadedColors[`${color}Lighter`] = Color(loadedColors[color]).lighten(0.7).desaturate(0.3).hex()
        loadedColors[`${color}ContainerVariant`] = Color(loadedColors[color]).lighten(1.2).desaturate(0.3).hex()
      })
      loadedColors.onBackgroundLight = Color(loadedColors.onBackground).darken(0.3).hex()
      loadedColors.onBackgroundLighter = Color(loadedColors.onBackground).darken(0.5).hex()
    } else {
      ['primary', 'secondary', 'tertiary'].forEach((color) => {
        // loadedColors[`${color}Light`] = Color(loadedColors[color]).lighten(0.95).desaturate(0.7).hex()
        loadedColors[`${color}Light`] = Color(loadedColors[color]).lighten(1.3).desaturate(0.3).hex()
        loadedColors[`${color}Lighter`] = Color(loadedColors[color]).lighten(1.6).desaturate(0.3).hex()
        loadedColors[`${color}ContainerVariant`] = Color(loadedColors[color]).darken(0.05).desaturate(0.3).hex()
      })
      loadedColors.onBackgroundLight = Color(loadedColors.onBackground).lighten(3).hex()
      loadedColors.onBackgroundLighter = Color(loadedColors.onBackground).lighten(6).hex()
    }

    return loadedColors
  }, [colorScheme])

  const paperTheme = useMemo(() => {
    return {
      ...(colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme),
      colors
    }
  }, [colors, colorScheme])

  const navigationTheme = useMemo(() => {
    return {
      dark: colorScheme === 'dark',
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.onBackground,
        border: colors.outline,
        notification: colors.primary
      }
    }
  }, [colors, colorScheme])

  return [paperTheme, navigationTheme]
}
