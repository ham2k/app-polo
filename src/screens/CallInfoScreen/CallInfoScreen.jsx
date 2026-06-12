/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { slashZeros } from '@ham2k/lib-format-tools'

import ScreenContainer from '../components/ScreenContainer'
import { CallInfoPanel } from '../OperationScreens/OpInfoTab/components/CallInfoPanel'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { selectSectionedQSOs } from '../../store/qsos'

export default function CallInfoScreen ({ navigation, route }) {
  const call = route?.params?.call
  const operation = route?.params?.operation ?? {}

  const qso = route?.params?.qso ?? { their: { call } }

  const sectionedQSOsSelector = useCallback((state) => selectSectionedQSOs(state, operation?.uuid), [operation?.uuid])
  const { qsos, activeQSOs, sections } = useSelector(sectionedQSOsSelector)

  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()

  useEffect(() => {
    navigation.setOptions({ title: slashZeros(call) })
  }, [navigation, call])

  return (
    <ScreenContainer>
      <View
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
          qsos={qsos}
          activeQSOs={activeQSOs}
          sections={sections}
        />
      </View>
    </ScreenContainer>
  )
}
