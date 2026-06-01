/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useIsFocused } from '@react-navigation/native'

import { fmtNumber } from '@ham2k/lib-format-tools'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, selectOperationCallInfo } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { selectRuntimeOnline } from '../../../store/runtime'
import { selectVFO } from '../../../store/station/stationSlice'
import { selectSectionedQSOs } from '../../../store/qsos'
import { findBestHook, findHooks } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'
import { useSelectorConditionally } from '../../components/useConditionally'

import QSOList from './components/QSOList'
import LoggingPanel from './components/LoggingPanel'
import { useAutoRespotting } from './components/LoggingPanel/SecondaryExchangePanel/SpotterControl'
import { manageNextQSO } from './components/LoggingPanel/loggingFunctions'
import { useUIState } from '../../../store/ui'

const flexOne = { flex: 1 }
const flexZero = { flex: 0 }

export default function OpLoggingTab ({ navigation, route, splitView }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const online = useSelector(selectRuntimeOnline)
  const styles = useThemedStyles()

  const isFocused = useIsFocused()

  const rootNavigator = (navigation?.getParent() ?? navigation)
  const rootParams = useMemo(() => {
    const rootRoute = rootNavigator.getState().routes.find(r => r.name === 'Operation')
    return rootRoute?.params ?? {}
  }, [rootNavigator])

  const operationSelector = useCallback((state) => selectOperation(state, rootParams.uuid), [rootParams.uuid])
  const operation = useSelectorConditionally(isFocused, operationSelector)
  const vfoSelector = useCallback((state) => selectVFO(state), [])
  const vfo = useSelectorConditionally(isFocused, vfoSelector)
  const ourInfoSelector = useCallback((state) => selectOperationCallInfo(state, operation?.uuid), [operation?.uuid])
  const ourInfo = useSelectorConditionally(isFocused, ourInfoSelector)

  const settings = useSelectorConditionally(isFocused, selectSettings)

  // Memoize the selector function to prevent excessive calls
  const sectionedQSOsSelector = useCallback(
    (state) => selectSectionedQSOs(state, operation?.uuid, settings.showDeletedQSOs !== false),
    [operation?.uuid, settings.showDeletedQSOs]
  )
  const { sections, qsos, activeQSOs } = useSelectorConditionally(isFocused, sectionedQSOsSelector)

  useAutoRespotting({ t, operation, vfo, dispatch, settings })

  const [lastUUID] = useUIState('OpLoggingTab', 'lastUUID')
  const [selectedUUID] = useUIState('OpLoggingTab', 'selectedUUID')
  const [currentOperationUUID, setCurrentOperationUUID] = useState()

  useEffect(() => { // If this is a different operation, prepare a new QSO
    if (operation?.uuid !== currentOperationUUID) {
      setCurrentOperationUUID(operation?.uuid)
      dispatch(manageNextQSO({ qsos, operation, vfo, settings }))
    }
  }, [operation, currentOperationUUID, dispatch, qsos, vfo, settings])

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
    dispatch(manageNextQSO({ selectedUUID: uuid, qsos, operation, vfo, settings }))
  }, [dispatch, qsos, operation, vfo, settings])

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
        lastUUID={lastUUID}
        selectedUUID={selectedUUID}
        onSelectQSO={handleSelectQSO}
      />

      <LoggingPanel
        style={[flexZero, { minHeight: 200 }]}
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
