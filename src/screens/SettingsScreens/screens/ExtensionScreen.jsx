/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings } from '../../../store/settings'
import { findBestHook } from '../../../extensions/registry'
import ScreenContainer from '../../components/ScreenContainer'

export default function ExtensionScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const dispatch = useDispatch()

  const screenHook = useMemo(() => {
    return findBestHook('screen', { key: route.params.key })
  }, [route])

  useEffect(() => {
    if (!screenHook?.ScreenComponent) {
      navigation.goBack()
    }
  })

  return (
    <ScreenContainer>
      <screenHook.ScreenComponent styles={styles} settings={settings} navigation={navigation} route={route} dispatch={dispatch} />
    </ScreenContainer>
  )
}
