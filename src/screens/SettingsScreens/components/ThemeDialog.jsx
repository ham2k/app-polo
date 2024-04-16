/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, RadioButton, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setSettings } from '../../../store/settings'
import { KeyboardAvoidingView, View } from 'react-native'

export function ThemeDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(settings?.theme || 'auto')
  }, [settings])

  const handleAccept = useCallback(() => {
    dispatch(setSettings({ theme: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [value, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(settings.theme)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

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
