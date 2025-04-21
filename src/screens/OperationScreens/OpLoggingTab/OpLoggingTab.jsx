/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect } from 'react'

import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, selectOperationCallInfo } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { useUIState } from '../../../store/ui'
import { selectRuntimeOnline } from '../../../store/runtime'
import { selectVFO } from '../../../store/station/stationSlice'
import QSOList from './components/QSOList'
import LoggingPanel from './components/LoggingPanel'
import { selectSectionedQSOs } from '../../../store/qsos'

const flexOne = { flex: 1 }
const flexZero = { flex: 0 }

export default function OpLoggingTab ({ navigation, route }) {
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const vfo = useSelector(state => selectVFO(state))
  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)

  const { sections, qsos, activeQSOs } = useSelector(state => selectSectionedQSOs(state, operation?.uuid, settings.showDeletedQSOs !== false))

  const [loggingState, setLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  useEffect(() => { // Reset logging state when operation changes
    if (loggingState?.operationUUID !== operation?.uuid) {
      setLoggingState({ operationUUID: operation?.uuid, selectedUUID: undefined })
    }
  }, [loggingState?.operationUUID, loggingState?.qso, operation?.uuid, setLoggingState])

  useEffect(() => { // Inject suggested-qso when present
    if (route?.params?.qso?._suggestedKey && loggingState?.suggestedQSO?._suggestedKey !== route.params.qso._suggestedKey && loggingState?.qso?._suggestedKey !== route.params.qso._suggestedKey) {
      setLoggingState({ ...loggingState, selectedUUID: 'suggested-qso', suggestedQSO: route.params.qso })
      if (route?.params?.splitView) {
        navigation.navigate('Operation', { ...route?.params, qso: undefined })
      } else {
        navigation.navigate('OpLog', { qso: undefined })
      }
    }
  }, [loggingState, setLoggingState, navigation, route.params])

  useEffect(() => { // Set navigation title
    if (styles?.smOrLarger) {
      navigation.setOptions({ title: `${activeQSOs.length} ${activeQSOs.length !== 1 ? 'QSOs' : 'QSO'}`, iconName: 'radio' })
    } else {
      navigation.setOptions({ title: `${activeQSOs.length} ${activeQSOs.length !== 1 ? 'Qs' : 'Q'}`, iconName: 'radio' })
    }
  }, [navigation, activeQSOs, styles?.smOrLarger])

  const showOpInfo = useCallback(() => {
    navigation.navigate('OpInfo', { operation, uuid: operation.uuid })
  }, [navigation, operation])

  return (
    <View style={flexOne}>
      <QSOList
        style={flexOne}
        qsos={settings.showDeletedQSOs === false ? activeQSOs : qsos}
        sections={sections}
        vfo={vfo}
        settings={settings}
        operation={operation}
        ourInfo={ourInfo}
        onHeaderPress={showOpInfo}
      />

      <LoggingPanel
        style={flexZero}
        operation={operation}
        qsos={qsos}
        sections={sections}
        activeQSOs={activeQSOs}
        vfo={vfo}
        settings={settings}
        ourInfo={ourInfo}
        online={online}
      />
    </View>
  )
}
