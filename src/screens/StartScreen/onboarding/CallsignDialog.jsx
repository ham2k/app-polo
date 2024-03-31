import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import CallsignInput from '../../components/CallsignInput'
import { useDispatch } from 'react-redux'
import { setSettings } from '../../../store/settings'
import { KeyboardAvoidingView } from 'react-native'

export function OnboardingDialog ({ visible, settings, styles, onDialogDone, onDialogCancel }) {
  const dispatch = useDispatch()

  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    if (settings?.operatorCall === 'N0CALL') {
      setValue('')
    } else {
      setValue(settings?.operatorCall || '')
    }
  }, [settings])

  const onChangeText = useCallback((text) => {
    setValue(text)
  }, [setValue])

  const handleAccept = useCallback(() => {
    dispatch(setSettings({ operatorCall: value }))

    onDialogDone && onDialogDone()
  }, [value, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    onDialogCancel && onDialogCancel()
  }, [onDialogCancel])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={true} onDismiss={handleCancel}>
          <Dialog.Title style={{ textAlign: 'center' }}>First, some questions…</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">What's your callsign?</Text>
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
            <Button onPress={handleAccept}>Continue</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}
