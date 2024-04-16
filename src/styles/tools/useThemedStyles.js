/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react'
import { useTheme } from 'react-native-paper'

import { prepareGlobalStyles } from '../globalStyles'
import { useColorScheme, useWindowDimensions } from 'react-native'
import { useSelector } from 'react-redux'
import { selectSettings } from '../../store/settings'

export function useThemedStyles (styleMassager, extraArg1, extraArg2, extraArg3) {
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
      return styleMassager(baseStyles, extraArg1, extraArg2, extraArg3)
    } else {
      return baseStyles
    }
  }, [baseStyles, styleMassager, extraArg1, extraArg2, extraArg3])

  return styles
}
