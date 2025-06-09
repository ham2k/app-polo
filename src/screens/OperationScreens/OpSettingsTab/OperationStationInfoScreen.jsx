/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Text } from 'react-native-paper'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings } from '../../../store/settings'
import { selectOperation, setOperationData, setOperationLocalData } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import CallsignInput from '../../components/CallsignInput'
import { batchUpdateQSOs, selectQSOs } from '../../../store/qsos'
import { joinAnd } from '../../../tools/joinAnd'

export default function OperationStationInfoScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const operation = useSelector(state => selectOperation(state, route.params.operation))
  const qsos = useSelector(state => selectQSOs(state, route.params.operation))

  // eslint-disable-next-line no-unused-vars
  const [doReload, setDoReload] = useState()

  useEffect(() => {
    if (!operation) {
      navigation.goBack()
    }
  }, [navigation, operation])

  const [originalValues] = useState({
    stationCall: operation.stationCall,
    operatorCall: operation.local?.operatorCall ?? ''
  })

  const [extraState, setExtraState] = useState({
    messageForStationCall: '',
    messageForOperatorCall: ''
  })

  const stations = useMemo(() => {
    const set = new Set()
    qsos.forEach(qso => set.add(qso?.our?.call ?? ''))
    return [...set].filter(Boolean)
  }, [qsos])

  const operators = useMemo(() => {
    const set = new Set()
    qsos.forEach(qso => set.add(qso?.our?.operatorCall || ''))
    return [...set].filter(Boolean)
  }, [qsos])

  useEffect(() => {
    const timeout = setTimeout(() => {
      const newExtraState = {}
      const singleStation = stations.length === 1 && stations[0]
      if (stations.length === 0 || singleStation === operation.stationCall) {
        newExtraState.messageForStationCall = ''
        newExtraState.actionForStationCall = ''
      } else if (stations.length === 1 && singleStation !== operation.stationCall) {
        newExtraState.messageForStationCall = `${singleStation || 'No call'} used so far.\n${operation.stationCall} will be used for new QSOs.`
        newExtraState.actionForStationCall = `Update ${operation.stationCall} on ${qsos.length} existing QSOs`.replaceAll('1 existing QSOs', '1 existing QSO')
      } else {
        newExtraState.messageForStationCall = `This activity already has QSOs using multiple station callsigns: ${joinAnd(stations)}.\n\n${operation.stationCall} will only be used for new QSOs.`
        newExtraState.actionForStationCall = ''
      }

      const singleOperator = operators.length === 1 && operators[0]

      if (operators.length === 0 || singleOperator === operation.local?.operatorCall) {
        newExtraState.messageForOperatorCall = ''
        newExtraState.actionForOperatorCall = ''
      } else if (operators.length === 1 && singleOperator !== operation.local?.operatorCall) {
        newExtraState.messageForOperatorCall = `${singleOperator || 'No call'} used so far.\n${operation.local?.operatorCall} will be used for new QSOs.`
        newExtraState.actionForOperatorCall = `Update ${operation.local?.operatorCall} as operator for all QSOs`
      } else {
        newExtraState.messageForOperatorCall = `This activity already has QSOs using multiple operator callsigns: ${joinAnd(operators)}.\n\n${operation.local?.operatorCall} will only be used for new QSOs.`
        newExtraState.actionForOperatorCall = ''
      }

      setExtraState(newExtraState)
    }, 500)
    return () => clearTimeout(timeout)
  }, [stations, operators, qsos.length, settings.stationCall, settings.operatorCall, operation.stationCall, operation.local?.operatorCall, originalValues?.stationCall, originalValues?.operatorCall])

  useEffect(() => { // Set initial values if needed
    if (!operation?.uuid) return

    if (operation.stationCall === undefined) {
      dispatch(setOperationData({ uuid: operation.uuid, stationCall: settings?.stationCall || settings?.operatorCall || '' }))
    }

    if (operation.local?.operatorCall === undefined &&
    operation.stationCall !== settings?.operatorCall &&
    (!operation.stationCallPlusArray || operation.stationCallPlusArray.indexOf(settings?.operatorCall) === -1)) {
      dispatch(setOperationLocalData({ uuid: operation.uuid, operatorCall: settings?.operatorCall || '' }))
    }
  }, [dispatch, operation.uuid, operation.stationCall, operation.stationCallPlusArray, operation.local?.operatorCall, settings?.operatorCall, settings?.stationCall])

  const onChangeStation = useCallback((text) => {
    const calls = text.split(/[, ]+/).filter(Boolean)
    if (calls.length > 1) {
      dispatch(setOperationData({
        uuid: operation.uuid,
        stationCall: calls[0] || '',
        stationCallPlus: `${calls[0]}+${calls.slice(1).length}`,
        stationCallPlusArray: calls.slice(1),
        allStationCalls: text
      }))
      dispatch(setOperationLocalData({ uuid: operation.uuid, operatorCall: '' }))
    } else {
      dispatch(setOperationData({
        uuid: operation.uuid,
        stationCall: calls[0] || '',
        stationCallPlus: calls[0],
        stationCallPlusArray: undefined,
        allStationCalls: text
      }))
    }
  }, [dispatch, operation.uuid])

  const onChangeOperator = useCallback((text) => {
    dispatch(setOperationLocalData({ uuid: operation.uuid, operatorCall: text }))
  }, [dispatch, operation.uuid])

  const handleUpdateStation = useCallback(() => {
    dispatch(batchUpdateQSOs({ uuid: operation.uuid, qsos, data: { our: { call: operation.stationCall } } }))
    setDoReload(Date.now())
  }, [dispatch, operation.uuid, operation.stationCall, qsos])

  const handleUpdateOperator = useCallback(() => {
    dispatch(batchUpdateQSOs({ uuid: operation.uuid, qsos, data: { our: { operatorCall: operation.local?.operatorCall } } }))
  }, [dispatch, operation.uuid, operation.local?.operatorCall, qsos])

  return (
    <ScreenContainer>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, paddingVertical: styles.oneSpace, paddingHorizontal: styles.oneSpace * 2 }}>
          <Ham2kListSection>
            <Text variant="bodyMedium">What is the callsign used on the air?</Text>
            <CallsignInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={operation.allStationCalls || operation.stationCall || ''}
              label="Station Callsign"
              placeholder={'N0CALL'}
              allowMultiple={true}
              onChangeText={onChangeStation}
            />
            {extraState.messageForStationCall && (
              <Text variant="bodyMedium" style={{ color: styles.colors.primary, fontWeight: 'bold', textAlign: 'center', marginTop: styles.oneSpace * 2 }}>
                {extraState.messageForStationCall}
              </Text>
            )}
            {extraState.actionForStationCall && (
              <View style={{ marginTop: styles.oneSpace * 2, alignItems: 'center' }}>
                <Button mode="outlined" style={{ flex: 0 }} onPress={handleUpdateStation}>{extraState.actionForStationCall}</Button>
              </View>
            )}
          </Ham2kListSection>

          <Ham2kListSection style={{ marginTop: styles.oneSpace * 3 }}>
            <Text variant="bodyMedium">Who is operating the station? (optional)</Text>
            <CallsignInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={operation.local?.operatorCall || ''}
              label="Operator Callsign"
              placeholder={'N0CALL'}
              onChangeText={onChangeOperator}
              disabled={operation.stationCallPlusArray?.length > 0}
            />
            {extraState.messageForOperatorCall && (
              <Text variant="bodyMedium" style={{ color: styles.colors.primary, fontWeight: 'bold', textAlign: 'center', marginTop: styles.oneSpace * 2 }}>
                {extraState.messageForOperatorCall}
              </Text>
            )}
            {extraState.actionForOperatorCall && (
              <View style={{ marginTop: styles.oneSpace * 2, alignItems: 'center' }}>
                <Button mode="outlined" style={{ flex: 0 }}onPress={handleUpdateOperator}>{extraState.actionForOperatorCall}</Button>
              </View>
            )}
          </Ham2kListSection>
        </ScrollView>
      </SafeAreaView>
    </ScreenContainer>
  )
}
