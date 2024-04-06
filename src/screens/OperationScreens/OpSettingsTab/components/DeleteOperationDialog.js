import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { deleteOperation } from '../../../../store/operations'
import { useNavigation } from '@react-navigation/native'

export function DeleteOperationDialog ({ operation, visible, settings, styles, onDialogDone }) {
  const navigation = useNavigation()
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  const handleAccept = useCallback(() => {
    setDialogVisible(false)
    dispatch(deleteOperation(operation.uuid)).then(() => {
      navigation.navigate('Home')
    })
    onDialogDone && onDialogDone()
  }, [operation, dispatch, onDialogDone, navigation])

  const handleCancel = useCallback(() => {
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone])

  return (
    <Portal>
      <Dialog visible={dialogVisible} onDismiss={handleCancel}>
        <Dialog.Icon icon="delete" color={styles.theme.colors.error} />
        <Dialog.Title style={{ textAlign: 'center', color: styles.theme.colors.error }}>Delete operation?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">Are you sure you want to delete this operation?</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleCancel}>Cancel</Button>
          <Button onPress={handleAccept} textColor={styles.theme.colors.error}>Yes, Delete</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}
