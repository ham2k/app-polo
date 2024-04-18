/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import CallsignInput from '../../../components/CallsignInput'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../../store/operations'
import { KeyboardAvoidingView } from 'react-native'

export function StationCallsignDialog ({ operation, visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(operation?.stationCall || '')
  }, [operation])

  const onChange = useCallback((text) => {
    setValue(text)
  }, [setValue])

  const handleAccept = useCallback(() => {
    dispatch(setOperationData({ uuid: operation.uuid, stationCall: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [dispatch, operation, value, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(operation.stationCall)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [operation, onDialogDone])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={dialogVisible} onDismiss={handleCancel}>
          <Dialog.Title style={{ textAlign: 'center' }}>Station's Callsign</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Enter a Station Callsign, if different from the current operator {settings?.operatorCall}</Text>
            <CallsignInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={value}
              label="Station Callsign"
              placeholder={settings?.operatorCall ? `Defaults to ${settings?.operatorCall}` : 'N0CALL'}
              onChangeText={onChange}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancel}>Cancel</Button>
            <Button onPress={handleAccept}>Ok</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}
