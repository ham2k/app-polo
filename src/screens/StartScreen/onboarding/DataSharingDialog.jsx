import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import CallsignInput from '../../components/CallsignInput'
import { useDispatch } from 'react-redux'
import { setSettings } from '../../../store/settings'
import { KeyboardAvoidingView } from 'react-native'

export function ActivitiesDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [values, setValues] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValues({
      ['extensions/pota']: settings['extensions/pota'],
      ['extensions/pota']: settings['extensions/pota'],
      ['extensions/pota']: settings['extensions/wwff'],
  }, [settings])

  const handleAccept = useCallback(() => {
    dispatch(setSettings(values)
    onDialogDone && onDialogDone()
  }, [value, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
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
              value={value ?? ''}
              label="Operator's Callsign"
              placeholder="N0CALL"
              onChangeText={onChangeText}
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
