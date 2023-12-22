import React, { useCallback, useEffect, useState } from 'react'
import { Button, Chip, Dialog, Portal, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setOperation } from '../../../../store/operations'
import { KeyboardAvoidingView, Linking } from 'react-native'

export function WWFFDialog ({ operation, visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(operation?.wwff || '')
  }, [operation])

  // const onChange = useCallback((text) => {
  //   setValue(text)
  // }, [setValue])

  const handleAccept = useCallback(() => {
    dispatch(setOperation({ uuid: operation.uuid, wwff: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [value, operation, dispatch, onDialogDone])

  const handleRemove = useCallback(() => {
    dispatch(setOperation({ uuid: operation.uuid, wwff: undefined }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [operation, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(operation.wwff)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [operation, onDialogDone])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={dialogVisible} onDismiss={handleCancel}>
          <Dialog.Icon icon="flower" />
          <Dialog.Title style={{ textAlign: 'center' }}>World Wide Flora & Fauna</Dialog.Title>
          <Dialog.Content style={{ alignSelf: 'center', textAlign: 'center' }}>
            <Chip icon="web" mode="flat" onPress={() => Linking.openURL('https://wwff.co/')}>More Information</Chip>
          </Dialog.Content>
          <Dialog.Content>
            <Text variant="bodyMedium">Coming soon!!!</Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'space-between' }}>
            <Button onPress={handleRemove} textColor={styles.theme.colors.error}>Remove</Button>
            <Text style={{ flex: 1 }} />
            <Button onPress={handleCancel}>Cancel</Button>
            <Button onPress={handleAccept}>Ok</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}
