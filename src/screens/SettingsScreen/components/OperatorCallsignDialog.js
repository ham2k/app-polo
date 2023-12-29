import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import CallsignInput from '../../components/CallsignInput'
import { useDispatch } from 'react-redux'
import { setSettings } from '../../../store/settings'
import { KeyboardAvoidingView } from 'react-native'

export function OperatorCallsignDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(settings?.operatorCall || '')
  }, [settings])

  const onChange = useCallback((text) => {
    setValue(text)
  }, [setValue])

  const handleAccept = useCallback(() => {
    dispatch(setSettings({ operatorCall: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [value, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(settings.operatorCall)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={dialogVisible} onDismiss={handleCancel}>
          <Dialog.Icon icon="card-account-details" />
          <Dialog.Title style={{ textAlign: 'center' }}>Operator's Callsign</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Please enter the operator's callsign:</Text>
            <CallsignInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={value}
              label="Operator's Callsign"
              placeholder="N0CALL"
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
