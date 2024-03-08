import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../../store/operations'
import { KeyboardAvoidingView } from 'react-native'
import ThemedTextInput from '../../../components/ThemedTextInput'

const VALID_MAIDENHEAD_REGEX = /^([A-R]{2}|[A-R]{2}[0-9]{2}|[A-R]{2}[0-9]{2}[a-x]{2}||[A-R]{2}[0-9]{2}[a-x]{2}[0-9]{2})$/
const PARTIAL_MAIDENHEAD_REGEX = /^([A-R]{0,2}|[A-R]{2}[0-9]{0,2}|[A-R]{2}[0-9]{2}[a-x]{0,2}||[A-R]{2}[0-9]{2}[a-x]{2}[0-9]{0,2})$/

export function LocationDialog ({ operation, visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [grid, setGridValue] = useState('')
  const [isValid, setIsValidValue] = useState()

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setGridValue(operation?.grid || '')
  }, [operation])

  useEffect(() => {
    setIsValidValue(VALID_MAIDENHEAD_REGEX.test(grid))
  }, [grid])

  const handleGridChange = useCallback((text) => {
    text = text.substring(0, 4).toUpperCase() + text.substring(4).toLowerCase()
    if (PARTIAL_MAIDENHEAD_REGEX.test(text)) {
      setGridValue(text)
    }
  }, [setGridValue])

  const handleAccept = useCallback(() => {
    if (isValid) {
      dispatch(setOperationData({ uuid: operation.uuid, grid }))
    }
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [dispatch, operation, grid, isValid, onDialogDone])

  const handleCancel = useCallback(() => {
    setGridValue(operation.grid)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [operation, onDialogDone])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={dialogVisible} onDismiss={handleCancel}>
          <Dialog.Icon icon="map-marker-radius" />
          <Dialog.Title style={{ textAlign: 'center' }}>Station Location</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Enter a Maidenhead Grid Square Locator</Text>
            <ThemedTextInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={grid}
              label="Grid Square Locator"
              placeholder={'AA00aa'}
              onChangeText={handleGridChange}
              error={!isValid}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancel}>Cancel</Button>
            <Button onPress={handleAccept} disabled={!isValid}>Ok</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}
