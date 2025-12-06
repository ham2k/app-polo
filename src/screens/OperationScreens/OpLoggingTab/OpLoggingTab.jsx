/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect } from 'react'

import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, selectOperationCallInfo } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { useUIState } from '../../../store/ui'
import { selectRuntimeOnline } from '../../../store/runtime'
import { selectVFO } from '../../../store/station/stationSlice'
import QSOList from './components/QSOList'
import LoggingPanel from './components/LoggingPanel'
import { selectSectionedQSOs } from '../../../store/qsos'
import { findBestHook, findHooks } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'
import { useAutoRespotting } from './components/LoggingPanel/SecondaryExchangePanel/SpotterControl'
import { fmtNumber } from '@ham2k/lib-format-tools'

const flexOne = { flex: 1 }
const flexZero = { flex: 0 }

export default function OpLoggingTab ({ navigation, route, splitView }) {
  const { t } = useTranslation()
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const vfo = useSelector(state => selectVFO(state))
  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))
  const dispatch = useDispatch()
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)

  const { sections, qsos, activeQSOs } = useSelector(state => selectSectionedQSOs(state, operation?.uuid, settings.showDeletedQSOs !== false))

  const [loggingState, setLoggingState, updateLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  // console.log('OpLoggingTab render')
  // useEffect(() => console.log('-- OpLoggingTab navigation', navigation), [navigation])
  // useEffect(() => console.log('-- OpLoggingTab route', route), [route])
  // useEffect(() => console.log('-- OpLoggingTab operation', operation), [operation])
  // useEffect(() => console.log('-- OpLoggingTab vfo', vfo), [vfo])
  // useEffect(() => console.log('-- OpLoggingTab ourInfo', ourInfo), [ourInfo])
  // useEffect(() => console.log('-- OpLoggingTab dispatch', dispatch), [dispatch])
  // useEffect(() => console.log('-- OpLoggingTab styles', styles), [styles])
  // useEffect(() => console.log('-- OpLoggingTab settings', settings), [settings])
  // useEffect(() => console.log('-- OpLoggingTab online', online), [online])
  // useEffect(() => console.log('-- OpLoggingTab sections', sections), [sections])
  // useEffect(() => console.log('-- OpLoggingTab qsos', qsos), [qsos])
  // useEffect(() => console.log('-- OpLoggingTab activeQSOs', activeQSOs), [activeQSOs])
  // useEffect(() => console.log('-- OpLoggingTab loggingState', loggingState), [loggingState])

  useAutoRespotting({ t, operation, vfo, dispatch, settings })

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
    } else if (route?.params?.selectedUUID) {
      setLoggingState({ ...loggingState, selectedUUID: route.params.selectedUUID })
      navigation.replace('Operation', { ...route?.params, selectedUUID: undefined })
    }
  }, [loggingState, setLoggingState, navigation, route.params, operation.uuid])

  useEffect(() => { // Set navigation title
    if (styles?.smOrLarger) {
      navigation.setOptions({
        title: t('screens.opLoggingTab.qsosTabCount', '{{count}} QSOs', { count: activeQSOs.length, fmtCount: fmtNumber(activeQSOs.length) })
      })
    } else {
      navigation.setOptions({ title: t('screens.opLoggingTab.qsosCompactTabCount', '{{count}} Qs', { count: activeQSOs.length, fmtCount: fmtNumber(activeQSOs.length) }) })
    }
  }, [navigation, activeQSOs, styles?.smOrLarger, t])

  useEffect(() => { // Setup reference handlers
    const types = [...new Set((operation?.refs || []).map((ref) => ref?.type).filter(x => x))]
    const refHooks = types.map(type => (
      findBestHook(`ref:${type}`) || defaultReferenceHandlerFor(type)
    ))
    const activityHooks = findHooks('activity')

    const hooksWithSetupHandler = []
    hooksWithSetupHandler.push(...refHooks.filter(hook => hook.setupHandlerForActiveOperation))
    hooksWithSetupHandler.push(...activityHooks.filter(hook => hook.setupHandlerForActiveOperation))
    if (hooksWithSetupHandler.length > 0) {
      setTimeout(async () => {
        hooksWithSetupHandler.forEach(hook => {
          hook.setupHandlerForActiveOperation({ operation, settings, dispatch })
        })
      }, 1)
    }
  // We don't want to re-run this again if settings change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation?.uuid, operation?.refs?.map(r => r.type)?.join(','), dispatch])

  const showOpInfo = useCallback(() => {
    navigation.navigate('OpInfo', { operation, uuid: operation.uuid })
  }, [navigation, operation])

  const handleSelectQSO = useCallback((uuid) => {
    updateLoggingState({ selectedUUID: uuid })
  }, [updateLoggingState])

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
        lastUUID={loggingState?.lastUUID}
        selectedUUID={loggingState?.selectedUUID}
        onSelectQSO={handleSelectQSO}
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
        splitView={splitView}
      />
    </View>
  )
}
