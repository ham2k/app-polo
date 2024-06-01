/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Text } from 'react-native-paper'
import { ScrollView } from 'react-native'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings } from '../../../store/settings'
import { selectOperation, setOperationData } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import CallsignInput from '../../components/CallsignInput'

export default function OperationAddActivityScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation))
  const settings = useSelector(selectSettings)

  useEffect(() => {
    if (!operation) {
      navigation.goBack()
    }
  }, [navigation, operation])

  useEffect(() => {
    if (!operation) return
    const changes = {}
    if (operation.stationCall === undefined) {
      changes.stationCall = settings?.stationCall || settings?.operatorCall || ''
    }

    if (operation.operatorCall === undefined && operation.stationCall !== settings?.operatorCall) {
      changes.operatorCall = settings?.operatorCall || ''
    }

    if (Object.keys(changes).length > 0) {
      dispatch(setOperationData({ uuid: operation.uuid, ...changes }))
    }
  }, [dispatch, operation, settings?.operatorCall, settings?.stationCall])

  const onChangeStation = useCallback((text) => {
    dispatch(setOperationData({ uuid: operation.uuid, stationCall: text }))
  }, [dispatch, operation.uuid])

  const onChangeOperator = useCallback((text) => {
    dispatch(setOperationData({ uuid: operation.uuid, operatorCall: text }))
  }, [dispatch, operation.uuid])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, paddingVertical: styles.oneSpace, paddingHorizontal: styles.oneSpace * 2 }}>
        <Ham2kListSection>
          <Text variant="bodyMedium">What is the callsign used on the air?</Text>
          <CallsignInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            value={operation?.stationCall || ''}
            label="Station Callsign"
            placeholder={'N0CALL'}
            onChangeText={onChangeStation}
          />
        </Ham2kListSection>

        <Ham2kListSection style={{ marginTop: styles.oneSpace * 3 }}>
          <Text variant="bodyMedium">Who is operating the station? (optional)</Text>
          <CallsignInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            value={operation?.operatorCall || ''}
            label="Operator Callsign"
            placeholder={'N0CALL'}
            onChangeText={onChangeOperator}
          />
        </Ham2kListSection>
      </ScrollView>
    </ScreenContainer>
  )
}
