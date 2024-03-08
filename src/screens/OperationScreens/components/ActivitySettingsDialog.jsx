import React, { useCallback, useEffect, useState } from 'react'
import { Button, Chip, Dialog, Portal, Text } from 'react-native-paper'
import { KeyboardAvoidingView, Linking } from 'react-native'

export function ActivitySettingsDialog ({
  value,
  visible,
  onChange, onDialogDone,
  icon, title, info, content,
  removeOption,
  styles
}) {
  const [dialogVisible, setDialogVisible] = useState(false)
  const [localValue, setLocalValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setLocalValue(value || '')
  }, [value])

  const handleAccept = useCallback(() => {
    onChange && onChange(localValue)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [localValue, onDialogDone, onChange])

  const handleRemove = useCallback(() => {
    onChange && onChange(undefined)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone, onChange])

  const handleCancel = useCallback(() => {
    setLocalValue(value)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone, value])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={dialogVisible} onDismiss={handleCancel}>
          {typeof icon === 'string' ? (
            <Dialog.Icon icon={icon} />
          ) : (
            icon
          )}
          {typeof title === 'string' ? (
            <Dialog.Title style={{ textAlign: 'center' }}>{title}</Dialog.Title>
          ) : (
            title
          )}
          {typeof info === 'string' ? (
            <Dialog.Content style={{ alignSelf: 'center', textAlign: 'center' }}>
              <Chip icon="web" mode="flat" onPress={() => Linking.openURL(info)}>More Information</Chip>
            </Dialog.Content>
          ) : (
            info
          )}
          {typeof content === 'function' ? (
            <Dialog.Content>
              {content({ value: localValue, setValue: setLocalValue })}
            </Dialog.Content>
          ) : (
            content
          )}
          <Dialog.Actions style={{ justifyContent: 'space-between' }}>
            {removeOption && <Button onPress={handleRemove} textColor={styles.theme.colors.error}>Remove</Button>}
            <Text style={{ flex: 1 }} />
            <Button onPress={handleCancel}>Cancel</Button>
            <Button onPress={handleAccept}>Ok</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}
