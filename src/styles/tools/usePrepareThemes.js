/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react'
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper'
import { useColorScheme } from 'react-native'
import Color from 'color'
import { useSelector } from 'react-redux'

import { selectSettings } from '../../store/settings'
import { useComputeSizes } from './computeSizes'

import lightColors from '../lightColors'
import darkColors from '../darkColors'
import fontConfig from '../fonts'

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

  const sizes = useComputeSizes()

  const fonts = useMemo(() => configureFonts({ config: fontConfig }), [])

  const colors = useMemo(() => {
    const loadedColors = colorScheme === 'dark' ? darkColors.colors : lightColors.colors

    if (colorScheme === 'dark') {
      ['primary', 'secondary', 'tertiary'].forEach((color) => {
        const upcasedColor = color.charAt(0).toUpperCase() + color.slice(1)
        loadedColors[`${color}Light`] = Color(loadedColors[color]).darken(0.6).desaturate(0.1).hex()
        loadedColors[`${color}Lighter`] = Color(loadedColors[color]).darken(0.5).desaturate(0.4).hex()
        loadedColors[`on${upcasedColor}Light`] = loadedColors[`on${upcasedColor}`]
        loadedColors[`on${upcasedColor}Lighter`] = Color(loadedColors[`on${upcasedColor}`]).lighten(5).desaturate(0.2).hex()
        loadedColors[`${color}Highlight`] = Color(loadedColors[color]).lighten(1).hex()
        loadedColors[`on${upcasedColor}Highlight`] = Color(loadedColors[`on${upcasedColor}`]).darken(2).hex()
        loadedColors[`${color}ContainerVariant`] = Color(loadedColors[color]).lighten(0.15).desaturate(0.1).hex()
        loadedColors[`${color}ContainerAlpha`] = Color(loadedColors[`${color}Container`]).alpha(0.8).string()
      })
      loadedColors.onBackgroundLight = Color(loadedColors.onBackground).darken(0.1).desaturate(0.1).hex()
      loadedColors.onBackgroundLighter = Color(loadedColors.onBackground).darken(0.5).hex()
    } else {
      ['primary', 'secondary', 'tertiary'].forEach((color) => {
        const upcasedColor = color.charAt(0).toUpperCase() + color.slice(1)
        // loadedColors[`${color}Light`] = Color(loadedColors[color]).lighten(0.95).desaturate(0.7).hex()
        loadedColors[`${color}Light`] = Color(loadedColors[color]).lighten(1.3).desaturate(0.3).hex()
        loadedColors[`${color}Lighter`] = Color(loadedColors[color]).lighten(1.9).desaturate(0.3).hex()
        loadedColors[`on${upcasedColor}Light`] = loadedColors[`on${upcasedColor}`]
        loadedColors[`on${upcasedColor}Lighter`] = Color(loadedColors[`on${upcasedColor}`]).darken(0.7).desaturate(0.2).hex()
        loadedColors[`${color}Highlight`] = Color(loadedColors[color]).lighten(1.9).desaturate(0.3).hex()
        loadedColors[`on${upcasedColor}Highlight`] = Color(loadedColors[`on${upcasedColor}`]).darken(0.7).desaturate(0.2).hex()
        loadedColors[`${color}ContainerVariant`] = Color(loadedColors[color]).darken(0.05).desaturate(0.3).hex()
        loadedColors[`${color}ContainerAlpha`] = Color(loadedColors[`${color}Container`]).alpha(0.8).string()
      })
      loadedColors.onBackgroundLight = Color(loadedColors.onBackground).lighten(3).hex()
      loadedColors.onBackgroundLighter = Color(loadedColors.onBackground).lighten(6).hex()
    }

    return loadedColors
  }, [colorScheme])

  const paperTheme = useMemo(() => {
    const baseTheme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        ...colors
      },
      fonts: {
        ...baseTheme.fonts,
        ...fonts
      },
      sizes: {
        ...baseTheme.sizes,
        ...sizes
      }
    }
  }, [colors, fonts, colorScheme, sizes])

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
      },
      fonts: {
        regular: {
          fontFamily: fontConfig.default.fontFamily,
          fontWeight: '400'
        },
        medium: {
          fontFamily: fontConfig.titleMedium.fontFamily,
          fontWeight: '500'
        },
        bold: {
          fontFamily: fontConfig.titleMedium.fontFamily,
          fontWeight: '600'
        },
        heavy: {
          fontFamily: fontConfig.titleMedium.fontFamily,
          fontWeight: '700'
        }
      }
    }
  }, [colors, colorScheme])

  return [paperTheme, navigationTheme]
}
