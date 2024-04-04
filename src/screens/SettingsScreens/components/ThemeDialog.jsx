import React, { useCallback } from 'react'
import { Button, Dialog, Portal, RadioButton, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setSettings } from '../../../store/settings'
import { KeyboardAvoidingView, View } from 'react-native'
import { useUIState } from '../../../store/ui'

export function ThemeDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useUIState('ThemeDialog', 'dialogVisible', visible)
  const [value, setValue] = useUIState('ThemeDialog', 'value', settings?.theme || 'auto')

  const handleAccept = useCallback(() => {
    dispatch(setSettings({ theme: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [dispatch, value, setDialogVisible, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(settings.theme)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [setValue, settings.theme, setDialogVisible, onDialogDone])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={dialogVisible} onDismiss={handleCancel}>
          <Dialog.Icon icon={{ dark: 'weather-night', light: 'white-balance-sunny' }[value] || 'theme-light-dark'} />
          <Dialog.Title style={{ textAlign: 'center' }}>Theme</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(v) => setValue(v)}
              value={value}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <RadioButton value="light" />
                <Text onPress={() => setValue('light')} style={styles.rowText}>Always in Light Mode</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <RadioButton value="dark" />
                <Text onPress={() => setValue('dark')} style={styles.rowText}>Always in Dark Mode</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <RadioButton value="auto" />
                <Text onPress={() => setValue('auto')} style={styles.rowText}>Same as Device Theme</Text>
              </View>
            </RadioButton.Group>
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
