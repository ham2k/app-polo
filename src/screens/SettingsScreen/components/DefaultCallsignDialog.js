import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import CallsignInput from '../../components/CallsignInput'
import { useDispatch } from 'react-redux'
import { setCall } from '../../../store/settings'

export function DefaultCallsignDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(settings?.call || '')
  }, [settings])

  const onChange = useCallback((text) => {
    setValue(text)
  }, [setValue])

  const handleAccept = useCallback(() => {
    dispatch(setCall(value))
    setDialogVisible(false)
  }, [value, dispatch])

  const handleCancel = useCallback(() => {
    setValue(settings.call)
    setDialogVisible(false)
  }, [settings])

  return (
    <Portal>
      <Dialog visible={dialogVisible} onDismiss={handleCancel}>
        <Dialog.Title>Default Callsign</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">Please enter a default callsign to use on new operations:</Text>
          <CallsignInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            value={value}
            label="Our Callsign"
            placeholder="N0CALL"
            onChangeText={onChange}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleCancel}>Cancel</Button>
          <Button onPress={handleAccept}>Ok</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}
