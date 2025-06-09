/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ScreenContainer from '../components/ScreenContainer'
import { CallInfoPanel } from '../OperationScreens/OpInfoTab/components/CallInfoPanel'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { slashZeros } from '../../tools/stringTools'

export default function CallInfoScreen ({ navigation, route }) {
  const call = route?.params?.call
  const operation = route?.params?.operation ?? {}
  const qso = route?.params?.qso ?? { their: { call } }

  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()

  useEffect(() => {
    navigation.setOptions({ title: slashZeros(call) })
  }, [navigation, call])

  return (
    <ScreenContainer>
      <GestureHandlerRootView
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch'
        }}
      >
        <CallInfoPanel
          styles={styles}
          style={{ paddingBottom: safeAreaInsets.bottom, paddingRight: safeAreaInsets.right, paddingLeft: safeAreaInsets.left }}
          themeColor={'tertiary'}
          call={call}
          qso={qso}
          operation={operation}
        />
      </GestureHandlerRootView>
    </ScreenContainer>
  )
}
