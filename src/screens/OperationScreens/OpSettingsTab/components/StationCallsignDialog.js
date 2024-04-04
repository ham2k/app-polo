import React, { useCallback, useEffect } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import CallsignInput from '../../../components/CallsignInput'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../../store/operations'
import { KeyboardAvoidingView } from 'react-native'
import { useUIState } from '../../../../store/ui'

export function StationCallsignDialog ({ operation, visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useUIState('OpSettingsTab.StationCallsignDialog', 'dialogVisible', visible)
  const [value, setValue] = useUIState('OpSettingsTab.StationCallsignDialog', 'value', '')

  useEffect(() => {
    setValue(operation?.stationCall || '')
  }, [operation, setValue])

  const onChange = useCallback((text) => {
    setValue(text)
  }, [setValue])

  const handleAccept = useCallback(() => {
    dispatch(setOperationData({ uuid: operation.uuid, stationCall: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [dispatch, operation.uuid, value, setDialogVisible, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(operation.stationCall)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [setValue, operation.stationCall, setDialogVisible, onDialogDone])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={dialogVisible} onDismiss={handleCancel}>
          <Dialog.Icon icon="card-account-details" />
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
