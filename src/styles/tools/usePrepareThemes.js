import { useMemo } from 'react'

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper'

import { useColorScheme } from 'react-native'

import lightColors from '../lightColors'
import darkColors from '../darkColors'
import Color from 'color'
import { useSelector } from 'react-redux'
import { selectSettings } from '../../store/settings'

export function usePrepareThemes () {
  const settings = useSelector(selectSettings)

  const deviceColorScheme = useColorScheme()
  const colorScheme = useMemo(() => {
    if (settings?.theme === 'dark' || settings?.theme === 'light') {
      return settings.theme
    } else {
      return deviceColorScheme
    }
  }, [settings?.theme, deviceColorScheme])

  const colors = useMemo(() => {
    const loadedColors = colorScheme === 'dark' ? darkColors.colors : lightColors.colors

    if (colorScheme === 'dark') {
      ['primary', 'secondary', 'tertiary'].forEach((color) => {
        const upcasedColor = color.charAt(0).toUpperCase() + color.slice(1)
        loadedColors[`${color}Light`] = Color(loadedColors[color]).darken(0.3).desaturate(0.3).hex()
        loadedColors[`${color}Lighter`] = Color(loadedColors[color]).darken(0.5).desaturate(0.4).hex()
        loadedColors[`on${upcasedColor}Light`] = loadedColors[`on${upcasedColor}`]
        loadedColors[`on${upcasedColor}Lighter`] = Color(loadedColors[`on${upcasedColor}`]).lighten(5).desaturate(0.2).hex()
        loadedColors[`${color}ContainerVariant`] = Color(loadedColors[color]).lighten(1.2).desaturate(0.3).hex()
        loadedColors[`${color}ContainerAlpha`] = Color(loadedColors[`${color}Container`]).alpha(0.8).string()
      })
      loadedColors.onBackgroundLight = Color(loadedColors.onBackground).darken(0.3).hex()
      loadedColors.onBackgroundLighter = Color(loadedColors.onBackground).darken(0.5).hex()
    } else {
      ['primary', 'secondary', 'tertiary'].forEach((color) => {
        const upcasedColor = color.charAt(0).toUpperCase() + color.slice(1)
        // loadedColors[`${color}Light`] = Color(loadedColors[color]).lighten(0.95).desaturate(0.7).hex()
        loadedColors[`${color}Light`] = Color(loadedColors[color]).lighten(1.3).desaturate(0.3).hex()
        loadedColors[`${color}Lighter`] = Color(loadedColors[color]).lighten(1.9).desaturate(0.3).hex()
        loadedColors[`on${upcasedColor}Light`] = loadedColors[`on${upcasedColor}`]
        loadedColors[`on${upcasedColor}Lighter`] = Color(loadedColors[`on${upcasedColor}`]).darken(0.7).desaturate(0.2).hex()
        loadedColors[`${color}ContainerVariant`] = Color(loadedColors[color]).darken(0.05).desaturate(0.3).hex()
        loadedColors[`${color}ContainerAlpha`] = Color(loadedColors[`${color}Container`]).alpha(0.8).string()
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
