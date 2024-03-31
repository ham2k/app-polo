import React, { useCallback } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import { KeyboardAvoidingView } from 'react-native'

export function OnboardingDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const handleNext = useCallback(() => {
    onDialogNext && onDialogNext()
  }, [onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={true} dismissable={false}>
          <Dialog.Title style={{ textAlign: 'center' }}>Welcome!</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">We have some questions first…</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handlePrevious}>{previousLabel ?? 'Cancel'}</Button>
            <Button onPress={handleNext}>{nextLabel ?? 'Continue'}</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}
