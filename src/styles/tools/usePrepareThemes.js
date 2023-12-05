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
      loadedColors.primaryContainerVariant = Color(loadedColors.primaryContainer).lighten(0.2).hex()
      loadedColors.secondaryContainerVariant = Color(loadedColors.secondaryContainer).lighten(0.2).hex()
      loadedColors.tertiaryContainerVariant = Color(loadedColors.tertiaryContainer).lighten(0.2).hex()
    } else {
      loadedColors.primaryContainerVariant = Color(loadedColors.primaryContainer).darken(0.2).hex()
      loadedColors.secondaryContainerVariant = Color(loadedColors.secondaryContainer).darken(0.2).hex()
      loadedColors.tertiaryContainerVariant = Color(loadedColors.tertiaryContainer).darken(0.2).hex()
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
