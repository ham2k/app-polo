/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { View } from 'react-native'

import { selectOperation } from '../../../store/operations'
import { useUIState } from '../../../store/ui'
import { selectSectionedQSOs } from '../../../store/qsos'

import { CallInfoPanel } from './components/CallInfoPanel'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { OpInfoPanel } from './components/OpInfoPanel'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function OpInfoTab ({ navigation, route }) {
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const [loggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  const { sections, qsos, activeQSOs } = useSelector(state => selectSectionedQSOs(state, operation?.uuid))

  const themeColor = useMemo(() => {
    return (!loggingState?.qso?._isNew ? 'secondary' : 'tertiary')
  }, [loggingState?.qso?._isNew])

  const styles = useThemedStyles()
  const safeArea = useSafeAreaInsets()

  return (
    <View
      style={{
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        backgroundColor: styles.theme.colors[`${themeColor}Container`],
        paddingRight: safeArea.right
      }}
    >
      <OpInfoPanel styles={styles} style={{ maxHeight: '95%' }} qsos={qsos} qso={loggingState.qso} activeQSOs={activeQSOs} sections={sections} operation={operation} themeColor={themeColor} />
      <CallInfoPanel styles={styles} style={{ flexDirection: 'column-reverse' }} qso={loggingState.qso} operation={operation} sections={sections} themeColor={themeColor} />
    </View>
  )
}
