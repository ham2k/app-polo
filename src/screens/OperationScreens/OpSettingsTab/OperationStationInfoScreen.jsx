/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Text } from 'react-native-paper'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { parseCallsign } from '@ham2k/lib-callsigns'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings } from '../../../store/settings'
import { selectOperation, setOperationData, setOperationLocalData } from '../../../store/operations'
import { batchUpdateQSOs, selectQSOs } from '../../../store/qsos'
import ScreenContainer from '../../components/ScreenContainer'
import { joinCalls } from '../../../tools/joinAnd'
import { H2kCallsignInput, H2kListItem, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'

export default function OperationStationInfoScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const operation = useSelector(state => selectOperation(state, route.params.operation))

  const qsos = useSelector(state => selectQSOs(state, route.params.operation))

  const [values, setValues] = useState({
    stationCall: operation?.stationCall,
    allStationCalls: operation?.allStationCalls,
    allOperatorCalls: operation?.allOperatorCalls,
    stationCallPlusArray: operation?.stationCallPlusArray,

    operatorCall: operation?.local?.operatorCall ?? operation?.operatorCall,
    isMultiStation: operation?.local?.isMultiStation,
    multiIdentifier: operation?.local?.multiIdentifier
  })

  // eslint-disable-next-line no-unused-vars
  const [doReload, setDoReload] = useState()

  useEffect(() => {
    if (!operation) {
      navigation.goBack()
    }

    navigation.setOptions({
      leftAction: 'accept',
      leftActionA11yLabel: 'Accept Changes',
      rightAction: 'revert',
      rightActionA11yLabel: 'Revert Changes',
      onLeftActionPress: () => {
        dispatch(setOperationLocalData({
          uuid: operation.uuid,
          operatorCall: values.operatorCall,
          isMultiStation: values.isMultiStation,
          multiIdentifier: values.multiIdentifier
        }))
        dispatch(setOperationData({
          uuid: operation.uuid,
          stationCall: values.stationCall,
          stationCallPlus: values.stationCallPlus,
          stationCallPlusArray: values.stationCallPlusArray,
          allStationCalls: values.allStationCalls
        }))
        navigation.goBack()
      },
      onRightActionPress: () => {
        navigation.goBack()
      }
    })
  }, [dispatch, navigation, operation, values])

  const stations = useMemo(() => {
    const set = new Set()
    qsos.forEach(qso => !qso.deleted && !qso.event && set.add(qso?.our?.call ?? ''))
    return [...set].filter(Boolean)
  }, [qsos])

  const operatorsUsedInQSOs = useMemo(() => {
    const set = new Set()
    qsos.forEach(qso => !qso.deleted && !qso.event && set.add(qso?.our?.operatorCall || ''))
    return [...set].filter(Boolean)
  }, [qsos])

  const {
    messageForStationCall, colorForStationCall, actionForStationCall,
    messageForOperatorCall, colorForOperatorCall, actionForOperatorCall
  } = useMemo(() => {
    const result = {}
    const singleStation = stations.length === 1 && stations[0]
    const allCalls = [values.stationCall, ...(values.stationCallPlusArray || [])].filter(Boolean)

    const badCalls = allCalls.filter(c => !parseCallsign(c).baseCall)

    if (badCalls.length === 1) {
      result.messageForStationCall = `Invalid callsign: \`${badCalls[0]}\``
      result.colorForStationCall = styles.colors.error
      result.actionForStationCall = ''
    } else if (badCalls.length > 1) {
      result.messageForStationCall = `Invalid callsigns: ${joinCalls(badCalls, { markdown: true })}`
      result.colorForStationCall = styles.colors.error
      result.actionForStationCall = ''
    } else if (stations.length === 0 || singleStation === values.stationCall) {
      result.messageForStationCall = ''
      result.colorForStationCall = styles.colors.primary
      result.actionForStationCall = ''
    } else if (stations.length === 1 && singleStation !== values.stationCall) {
      result.messageForStationCall = `${singleStation || 'No call'} used so far.\n\`${values.stationCall}\` will be used for new QSOs.`
      result.colorForStationCall = styles.colors.primary
      result.actionForStationCall = `Update \`${values.stationCall}\` on ${qsos.length} existing QSOs`.replaceAll('1 existing QSOs', '1 existing QSO')
    } else {
      result.messageForStationCall = `This activity already has QSOs using multiple station callsigns: ${joinCalls(stations, { markdown: true })}.\n\n\`${values.stationCall}\` will only be used for new QSOs.`
      result.colorForStationCall = styles.colors.primary
      result.actionForStationCall = ''
    }

    const singleCurrentOperator = operatorsUsedInQSOs.length === 1 && operatorsUsedInQSOs[0]
    const badOperatorCall = values.operatorCall && !parseCallsign(values.operatorCall).baseCall

    if (badOperatorCall) {
      result.messageForOperatorCall = `Invalid callsign: \`${values.operatorCall}\``
      result.colorForOperatorCall = styles.colors.error
      result.actionForOperatorCall = ''
    } else if (operatorsUsedInQSOs.length === 0 || singleCurrentOperator === values.operatorCall) {
      result.messageForOperatorCall = ''
      result.colorForOperatorCall = styles.colors.primary
      result.actionForOperatorCall = ''
    } else if (operatorsUsedInQSOs.length === 1 && singleCurrentOperator !== values.operatorCall) {
      if (singleCurrentOperator) {
        result.messageForOperatorCall = `\`${singleCurrentOperator}\` used so far.\n\`${values.operatorCall}\` will be used for new QSOs.`
      } else {
        result.messageForOperatorCall = `No call used so far.\n\`${values.operatorCall}\` will be used for new QSOs.`
      }
      result.colorForOperatorCall = styles.colors.primary
      result.actionForOperatorCall = `Update \`${values.operatorCall}\` as operator for all QSOs`
    } else {
      result.messageForOperatorCall = `This activity already has QSOs using multiple operator callsigns: ${joinCalls(operatorsUsedInQSOs, { markdown: true })}.\n\n\`${values.operatorCall}\` will only be used for new QSOs.`
      result.colorForOperatorCall = styles.colors.primary
      result.actionForOperatorCall = ''
    }

    return result
  }, [stations, operatorsUsedInQSOs, qsos.length, values, styles.colors.error, styles.colors.primary])

  useEffect(() => { // Set initial values if needed
    if (!operation?.uuid) return

    if (values.stationCall === undefined) {
      setValues({ ...values, stationCall: settings?.operatorCall || '' })
    }

    if (
      values.operatorCall === undefined &&
      values.stationCall !== settings?.operatorCall &&
      (!values.stationCallPlusArray || values.stationCallPlusArray.length === 0) &&
      settings?.suggestDefaultOperator !== false
    ) {
      setValues({ ...values, operatorCall: settings?.operatorCall || '' })
    } else if (
      values.operatorCall !== undefined &&
      values.operatorCall === settings?.operatorCall &&
      (values.stationCall === settings?.operatorCall ||
        (values.stationCallPlusArray && values.stationCallPlusArray?.indexOf(settings?.operatorCall) >= 0)
      )
    ) {
      setValues({ ...values, operatorCall: undefined })
    } else if (
      values.operatorCall !== undefined &&
      values.stationCallPlusArray?.length > 0
    ) {
      setValues({ ...values, operatorCall: undefined })
    }
  }, [dispatch, operation?.uuid, settings?.operatorCall, settings?.suggestDefaultOperator, values])

  const handleChangeStation = useCallback((text) => {
    const newCalls = text.split(/[, ]+/).filter(Boolean)
    if (newCalls.length > 1) {
      setValues({
        ...values,
        stationCall: newCalls[0] || '',
        stationCallPlus: `${newCalls[0]}+${newCalls.slice(1).length}`,
        stationCallPlusArray: newCalls.slice(1),
        allStationCalls: text,
        operatorCall: undefined
      })
    } else {
      setValues({
        ...values,
        stationCall: newCalls[0] || '',
        stationCallPlus: newCalls[0],
        stationCallPlusArray: undefined,
        allStationCalls: text
      })
    }
  }, [values])

  const handleChangeOperator = useCallback((text) => {
    // TODO:
    setValues({ ...values, operatorCall: text })
  }, [values])

  const handleReplaceStationInAllQSOs = useCallback(() => {
    dispatch(setOperationData({
      uuid: operation.uuid,
      stationCall: values.stationCall,
      stationCallPlus: values.stationCallPlus,
      stationCallPlusArray: values.stationCallPlusArray,
      allStationCalls: values.allStationCalls
    }))
    dispatch(batchUpdateQSOs({ uuid: operation.uuid, qsos, data: { our: { call: values.stationCall } } }))
    setDoReload(Date.now())
  }, [dispatch, operation.uuid, qsos, values])

  const handleReplaceOperatorInAllQSOs = useCallback(() => {
    dispatch(setOperationLocalData({
      uuid: operation.uuid,
      operatorCall: values.operatorCall
    }))
    dispatch(batchUpdateQSOs({ uuid: operation.uuid, qsos, data: { our: { operatorCall: values.operatorCall } } }))
  }, [dispatch, operation.uuid, values.operatorCall, qsos])

  const handleUpdateIsMultiStation = useCallback(() => {
    setValues({ ...values, isMultiStation: !values.isMultiStation })
  }, [values])

  const handleUpdateMultiIdentifier = useCallback((text) => {
    setValues({ ...values, multiIdentifier: text })
  }, [values])

  return (
    <ScreenContainer>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, paddingVertical: styles.oneSpace, paddingHorizontal: styles.oneSpace * 2 }}>
          <H2kListSection>
            <Text variant="bodyMedium">What is the callsign used on the air?</Text>
            <H2kCallsignInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={values.allStationCalls || values.stationCall || ''}
              label="Station Callsign"
              placeholder={'N0CALL'}
              allowMultiple={true}
              onChangeText={handleChangeStation}
            />
            {messageForStationCall && (
              <View style={{ marginTop: styles.oneSpace * 2, alignItems: 'center' }}>
                <H2kMarkdown style={{ ...styles.text.bodyMedium, color: colorForStationCall }}>{messageForStationCall}</H2kMarkdown>
              </View>
            )}
            {actionForStationCall && (
              <View style={{ marginTop: styles.oneSpace * 2, alignItems: 'center' }}>
                <Button mode="outlined" style={{ flex: 0 }} onPress={handleReplaceStationInAllQSOs}>{actionForStationCall}</Button>
              </View>
            )}
          </H2kListSection>

          <H2kListSection style={{ marginTop: styles.oneSpace * 3 }}>
            <Text
              variant="bodyMedium"
              style={values.stationCallPlusArray?.length ? { opacity: 0.5 } : {}}
            >
              Who is operating the station? (optional)
            </Text>
            <H2kCallsignInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={values.operatorCall ?? ''}
              label="Operator Callsign"
              placeholder={values.stationCallPlusArray?.length > 0 ? values.allStationCalls : 'N0CALL'}
              onChangeText={handleChangeOperator}
              disabled={values.stationCallPlusArray?.length}
            />
            {messageForOperatorCall && (
              <View style={{ marginTop: styles.oneSpace * 2, alignItems: 'center' }}>
                <H2kMarkdown style={{ ...styles.text.bodyMedium, color: colorForOperatorCall, fontWeight: 'bold' }}>{messageForOperatorCall}</H2kMarkdown>
              </View>
            )}
            {actionForOperatorCall && (
              <View style={{ marginTop: styles.oneSpace * 2, alignItems: 'center' }}>
                <Button mode="outlined" style={{ flex: 0 }}onPress={handleReplaceOperatorInAllQSOs}>{actionForOperatorCall}</Button>
              </View>
            )}
          </H2kListSection>
          {settings.devMode && (
            <H2kListSection style={{ marginTop: styles.oneSpace * 3 }}>
              <H2kListItem
                title="Multi-station operation?"
                description={values.isMultiStation ? "Yes, we're one of many!" : 'No, just a regular station'}
                leftIcon="account-group"
                rightSwitchValue={values.isMultiStation}
                rightSwitchOnValueChange={handleUpdateIsMultiStation}
                onPress={handleUpdateIsMultiStation}
                leftIconColor={styles.colors.devMode}
                titleStyle={{ color: styles.colors.devMode }}
                descriptionStyle={{ color: styles.colors.devMode }}
              />
              <H2kTextInput
                value={values.multiIdentifier ?? ''}
                onChangeText={handleUpdateMultiIdentifier}
                label="Identifier for this station (numbers only)"
                keyboard="numbers"
                numeric={true}
                disabled={!values.isMultiStation}
                themeColor={'devMode'}
              />
            </H2kListSection>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenContainer>
  )
}
