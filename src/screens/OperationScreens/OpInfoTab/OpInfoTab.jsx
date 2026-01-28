/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useIsFocused } from '@react-navigation/native'

import { selectOperation } from '../../../store/operations'
import { selectSectionedQSOs } from '../../../store/qsos'
import { useSelectorConditionally, useUIStateConditionally } from '../../components/useConditionally'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { CallInfoPanel } from './components/CallInfoPanel'
import { OpInfoPanel } from './components/OpInfoPanel'

export default function OpInfoTab ({ navigation, route }) {
  const isFocused = useIsFocused()
  const operation = useSelectorConditionally(isFocused ? 'opInfoTab operation' : undefined, state => selectOperation(state, route.params.operation.uuid))
  const [loggingState] = useUIStateConditionally(isFocused, 'OpLoggingTab', 'loggingState', {})

  const { sections, qsos, activeQSOs } = useSelectorConditionally(isFocused, state => selectSectionedQSOs(state, operation?.uuid))

  const themeColor = useMemo(() => {
    return (!loggingState?.qso?._isNew ? 'secondary' : 'tertiary')
  }, [loggingState?.qso?._isNew])

  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()

  return (
    <GestureHandlerRootView
      style={{
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'stretch',
        paddingRight: safeAreaInsets.right,
        backgroundColor: styles.theme.colors[`${themeColor}Container`]
      }}
    >
      {loggingState.qso?.their?.call ? (
        <CallInfoPanel styles={styles} style={{ paddingBottom: safeAreaInsets.bottom }} qso={loggingState.qso} operation={operation} sections={sections} themeColor={themeColor} />
      ) : (
        <OpInfoPanel styles={styles} style={{ paddingBottom: safeAreaInsets.bottom }} qsos={qsos} qso={loggingState.qso} activeQSOs={activeQSOs} sections={sections} operation={operation} themeColor={themeColor} />
      )}
    </GestureHandlerRootView>
  )
}
