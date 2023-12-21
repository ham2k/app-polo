import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import CallsignInput from '../../components/CallsignInput'
import { useDispatch } from 'react-redux'
import { setOperatorCall } from '../../../store/settings'

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
    console.log('OperatorCallsignDialog.onChange', text)
    setValue(text)
  }, [setValue])

  const handleAccept = useCallback(() => {
    dispatch(setOperatorCall(value))
    setDialogVisible(false)
  }, [value, dispatch])

  const handleCancel = useCallback(() => {
    setValue(settings.operatorCall)
    setDialogVisible(false)
  }, [settings])

  return (
    <Portal>
      <Dialog visible={dialogVisible} onDismiss={handleCancel}>
        <Dialog.Title>Operator's Callsign</Dialog.Title>
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
    </Portal>
  )
}
