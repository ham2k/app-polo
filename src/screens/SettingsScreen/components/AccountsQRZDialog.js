import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper'
import CallsignInput from '../../components/CallsignInput'
import { useDispatch } from 'react-redux'
import { setAccountInfo, setCall } from '../../../store/settings'
import ThemedTextInput from '../../components/ThemedTextInput'

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
  }, [login, password, dispatch])

  const handleCancel = useCallback(() => {
    setLogin(settings?.accounts?.qrz?.login || '')
    setPassword(settings?.accounts?.qrz?.password || '')
    setDialogVisible(false)
  }, [settings])

  return (
    <Portal>
      <Dialog visible={dialogVisible} onDismiss={handleCancel}>
        <Dialog.Title>QRZ.com Account</Dialog.Title>
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
      </Dialog>
    </Portal>
  )
}
