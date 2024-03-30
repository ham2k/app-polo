import { useMemo } from 'react'
import { useTheme } from 'react-native-paper'

import { prepareGlobalStyles } from '../globalStyles'
import { useColorScheme, useWindowDimensions } from 'react-native'
import { useSelector } from 'react-redux'
import { selectSettings } from '../../store/settings'

export function useThemedStyles (styleMassager) {
  const theme = useTheme()

  const { width, height } = useWindowDimensions()

  const settings = useSelector(selectSettings)

  const deviceColorScheme = useColorScheme()

  const colorScheme = useMemo(() => {
    if (settings?.theme === 'dark' || settings?.theme === 'light') {
      return settings.theme
    } else {
      return deviceColorScheme
    }
  }, [settings?.theme, deviceColorScheme])

  const baseStyles = useMemo(() => {
    return prepareGlobalStyles({ theme, colorScheme, width, height })
  }, [theme, colorScheme, width, height])

  const styles = useMemo(() => {
    if (styleMassager) {
      return styleMassager(baseStyles)
    } else {
      return baseStyles
    }
  }, [baseStyles, styleMassager])

  return styles
}
