import React, { useCallback } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'

export function WelcomeDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const handleNext = useCallback(() => {
    onDialogNext && onDialogNext()
  }, [onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <Dialog visible={true} dismissable={false}>
      <Dialog.Title style={{ textAlign: 'center' }}>Welcome to PoLo!</Dialog.Title>
      <Dialog.Content>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>We have a few questions to help us better suit your needs.</Text>
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={handlePrevious}>{previousLabel ?? 'Skip'}</Button>
        <Button onPress={handleNext}>{nextLabel ?? 'Continue'}</Button>
      </Dialog.Actions>
    </Dialog>
  )
}
