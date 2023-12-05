import { useMemo } from 'react'

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper'

import { useColorScheme } from 'react-native'

import lightColors from '../lightColors'
import darkColors from '../darkColors'

export function usePrepareThemes () {
  const colorScheme = useColorScheme()

  const colors = useMemo(() => {
    return colorScheme === 'dark' ? darkColors.colors : lightColors.colors
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
