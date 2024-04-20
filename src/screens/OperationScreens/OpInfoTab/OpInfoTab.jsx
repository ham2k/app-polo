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
import { selectQSOs } from '../../../store/qsos'

import { CallInfoPanel } from './components/CallInfoPanel'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { OpInfoPanel } from './components/OpInfoPanel'

export default function OpInfoTab ({ navigation, route }) {
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const [loggingState] = useUIState('OpLoggingTab', 'loggingState', {})
  const [qso] = useUIState('LoggingPanel', 'qso', {})

  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))
  const activeQSOs = useMemo(() => qsos.filter(q => !q.deleted), [qsos])

  const themeColor = useMemo(() => {
    return (loggingState.selectedKey === 'new-qso') ? 'tertiary' : 'secondary'
  }, [loggingState?.selectedKey])

  const styles = useThemedStyles()

  return (
    <View style={{ height: '100%', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch', backgroundColor: styles.theme.colors[`${themeColor}Container`] }}>
      <OpInfoPanel styles={styles} style={{ }} qsos={activeQSOs} operation={operation} themeColor={themeColor} />
      <CallInfoPanel styles={styles} style={{ flexDirection: 'column-reverse' }} qso={qso} operation={operation} themeColor={themeColor} />
    </View>
  )
}
