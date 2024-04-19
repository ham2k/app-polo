/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setAccountInfo } from '../../../store/settings'
import ThemedTextInput from '../../components/ThemedTextInput'
import { Ham2kDialog } from '../../components/Ham2kDialog'

export function AccountsQRZDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setLogin(settings?.accounts?.qrz?.login || '')
    setPassword(settings?.accounts?.qrz?.password || '')
  }, [settings])

  const onChangeLogin = useCallback((text) => {
    setLogin(text)
  }, [setLogin])
  const onChangePassword = useCallback((text) => {
    setPassword(text)
  }, [setPassword])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ qrz: { login, password } }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [login, password, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setLogin(settings?.accounts?.qrz?.login || '')
    setPassword(settings?.accounts?.qrz?.password || '')
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>QRZ.com Account</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium">Please enter the details for your QRZ.com account:</Text>
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={login}
          autoCapitalize={'none'}
          autoComplete="email"
          inputMode="email"
          keyboardType="email-address"
          label="Login"
          placeholder="your login"
          onChangeText={onChangeLogin}
        />
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={password}
          label="Password"
          autoComplete="password"
          keyboardType="visible-password"
          secureTextEntry={true}
          placeholder="your password"
          onChangeText={onChangePassword}
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
