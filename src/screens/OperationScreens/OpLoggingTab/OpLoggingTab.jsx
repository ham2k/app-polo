/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo } from 'react'

import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, selectOperationCallInfo } from '../../../store/operations'
import LoggingPanel from './components/LoggingPanel'
import QSOList from './components/QSOList'
import { selectQSOs } from '../../../store/qsos'
import { selectSettings } from '../../../store/settings'
import { useUIState } from '../../../store/ui'
import { selectRuntimeOnline } from '../../../store/runtime'

const flexOne = { flex: 1 }
const flexZero = { flex: 0 }

export default function OpLoggingTab ({ navigation, route }) {
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))
  const activeQSOs = useMemo(() => qsos.filter(qso => !qso.deleted), [qsos])
  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)

  const [,, updateLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  useEffect(() => {
    if (route?.params?.qso) {
      updateLoggingState({ selectedKey: 'suggested-qso', suggestedQSO: route.params.qso })
    }
  }, [route?.params?.qso, updateLoggingState])

  // Set navigation title
  useEffect(() => {
    if (styles?.smOrLarger) {
      navigation.setOptions({ title: `${activeQSOs.length} ${activeQSOs.length !== 1 ? 'QSOs' : 'QSO'}`, iconName: 'radio' })
    } else {
      navigation.setOptions({ title: `${activeQSOs.length} ${activeQSOs.length !== 1 ? 'Qs' : 'Q'}`, iconName: 'radio' })
    }
  }, [navigation, activeQSOs, styles?.smOrLarger])

  return (
    <View style={flexOne}>
      <QSOList
        style={flexOne}
        qsos={qsos}
        settings={settings}
        ourInfo={ourInfo}
      />

      <LoggingPanel
        style={flexZero}
        operation={operation}
        qsos={qsos}
        activeQSOs={activeQSOs}
        settings={settings}
        ourInfo={ourInfo}
        online={online}
      />
    </View>
  )
}
