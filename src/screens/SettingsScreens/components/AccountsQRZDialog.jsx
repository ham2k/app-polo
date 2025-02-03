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
import { apiQRZ } from '../../../store/apis/apiQRZ'
import { View } from 'react-native'
import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'

export function AccountsQRZDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [originalValues] = useState({
    login: settings?.accounts?.qrz?.login || '',
    password: settings?.accounts?.qrz?.password || ''
  })

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState()
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setLogin(settings?.accounts?.qrz?.login || '')
    setPassword(settings?.accounts?.qrz?.password || '')
  }, [settings])

  useEffect(() => {
    if (login?.indexOf('@') >= 0) {
      setError("Don't use your email for login.")
    } else {
      setError(null)
    }
  }, [login])

  const onChangeLogin = useCallback((text) => {
    setLogin(text)
    setTestResult(null)
  }, [setLogin])

  const onChangePassword = useCallback((text) => {
    setPassword(text)
    setTestResult(null)
  }, [setPassword])

  const handleTest = useCallback(async () => {
    await dispatch(setAccountInfo({ qrz: { login, password, session: undefined } }))
    const qrzPromise = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: settings?.operatorCall }, { forceRefetch: true }))
    await Promise.all(dispatch(apiQRZ.util.getRunningQueriesThunk()))
    const qrzLookup = await dispatch((_dispatch, getState) => apiQRZ.endpoints.lookupCall.select({ call: settings?.operatorCall })(getState()))
    qrzPromise.unsubscribe && qrzPromise.unsubscribe()

    if (qrzLookup?.error) {
      setTestResult(`‼️ ${qrzLookup?.error}`)
    } else {
      setTestResult(`✅ ${settings?.operatorCall}: ${qrzLookup?.data?.name}`)
    }
  }, [dispatch, login, password, settings?.operatorCall])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ qrz: { login, password, session: undefined } }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [login, password, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    dispatch(setAccountInfo({ qrz: originalValues }))
    setLogin(originalValues.login)
    setPassword(originalValues.password)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [originalValues, dispatch, onDialogDone])

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
          label="Login (your callsign)"
          placeholder="your login"
          error={error}
          onChangeText={onChangeLogin}
        />
        {error && <Text style={{ marginTop: styles.oneSpace, color: 'red' }}>{error}</Text>}
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={password}
          label="Password"
          autoComplete="current-password"
          keyboardType="default"
          textContentType="password"
          secureTextEntry={true}
          autoCapitalize={'none'}
          placeholder="your password"
          onChangeText={onChangePassword}
        />
        <View style={{ marginTop: styles.oneSpace, flexDirection: 'row' }}>
          {!testResult && <Button onPress={handleTest}>{'Check Credentials'}</Button>}
          {testResult && <Ham2kMarkdown style={{ flex: 1, marginTop: styles.oneSpace * 0.6 }}>{testResult}</Ham2kMarkdown>}
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
