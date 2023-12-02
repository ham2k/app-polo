import { useMemo } from 'react'
import { useTheme } from 'react-native-paper'

import { prepareGlobalStyles } from '../globalStyles'
import { useColorScheme } from 'react-native'

export function useThemedStyles (styleMassager) {
  const theme = useTheme()
  const colorScheme = useColorScheme()

  const baseStyles = useMemo(() => {
    return prepareGlobalStyles({ theme, colorScheme })
  }, [theme, colorScheme])

  const styles = useMemo(() => {
    if (styleMassager) {
      return styleMassager(baseStyles)
    } else {
      return baseStyles
    }
  }, [baseStyles, styleMassager])

  return styles
}
