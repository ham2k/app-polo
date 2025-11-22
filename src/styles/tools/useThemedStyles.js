/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useContext, useMemo } from 'react'
import { useTheme } from 'react-native-paper'

import { prepareGlobalStyles } from '../globalStyles'
import { useColorScheme } from 'react-native'
import { useSelector } from 'react-redux'
import { selectSettings } from '../../store/settings'
import { useSafeAreaFrame } from 'react-native-safe-area-context'
import { BaseStylesContext } from '../../App'

export function useBaseStyles({ theme }) {
  const { width, height } = useSafeAreaFrame()
  // const { width, height } = useWindowDimensions() <-- broken on iOS, no rotation

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

  return baseStyles
}

export function useThemedStyles(styleMassager, extraArg1, extraArg2, extraArg3, extraArg4) {
  const baseStyles = useContext(BaseStylesContext)

  const styles = useMemo(() => {
    if (styleMassager) {
      return styleMassager(baseStyles, extraArg1, extraArg2, extraArg3, extraArg4)
    } else {
      return baseStyles
    }
  }, [baseStyles, styleMassager, extraArg1, extraArg2, extraArg3, extraArg4])

  return styles
}
