/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { parseCallsign } from '@ham2k/lib-callsigns'

import { setAccountInfo } from '../../../store/settings'
import { apiQRZ } from '../../../store/apis/apiQRZ'
import { resetCallLookupCache } from '../../OperationScreens/OpLoggingTab/components/LoggingPanel/useCallLookup'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kMarkdown, H2kTextInput } from '../../../ui'

export function AccountsQRZDialog ({ visible, settings, styles, onDialogDone }) {
  const { t } = useTranslation()

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
      setError(t('screens.settings.accountsQRZ.errorEmail', "Don't use your email for login."))
    } else {
      setError(null)
    }
  }, [login, t])

  const onChangeLogin = useCallback((text) => {
    setLogin(text)
    setTestResult(null)
  }, [setLogin])

  const onChangePassword = useCallback((text) => {
    setPassword(text)
    setTestResult(null)
  }, [setPassword])

  const handleTest = useCallback(async () => {
    const callInfo = parseCallsign(settings?.operatorCall)
    await dispatch(setAccountInfo({ qrz: { login, password, session: undefined } }))

    const qrzPromise = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: callInfo.baseCall }, { forceRefetch: true }))
    await Promise.all(dispatch(apiQRZ.util.getRunningQueriesThunk()))
    const qrzLookup = await dispatch((_dispatch, getState) => apiQRZ.endpoints.lookupCall.select({ call: callInfo.baseCall })(getState()))
    qrzPromise.unsubscribe && qrzPromise.unsubscribe()

    if (qrzLookup?.error) {
      setTestResult(`‼️ ${qrzLookup?.error}`)
    } else {
      setTestResult(`✅ ${settings?.operatorCall}: ${qrzLookup?.data?.name}`)
    }
  }, [dispatch, login, password, settings?.operatorCall])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ qrz: { login, password, session: undefined } }))
    dispatch(resetCallLookupCache())
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
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.settings.accountsQRZ.dialogTitle', 'QRZ.com Account')}</H2kDialogTitle>
      <H2kDialogContent>
        <Text variant="bodyMedium">{t('screens.settings.accountsQRZ.pleaseEnterDetails', 'Please enter the details for your QRZ.com account:')}</Text>
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={login}
          autoCapitalize={'none'}
          autoComplete="email"
          inputMode="email"
          keyboardType="email-address"
          label={t('screens.settings.accountsQRZ.loginLabel', 'Login (your callsign)')}
          placeholder={t('screens.settings.accountsQRZ.loginPlaceholder', 'your login')}
          error={error}
          onChangeText={onChangeLogin}
        />
        {error && <Text style={{ marginTop: styles.oneSpace, color: 'red' }}>{error}</Text>}
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={password}
          label={t('screens.settings.accountsQRZ.passwordLabel', 'Password')}
          autoComplete="current-password"
          keyboardType="default"
          textContentType="password"
          secureTextEntry={true}
          autoCapitalize={'none'}
          placeholder={t('screens.settings.accountsQRZ.passwordPlaceholder', 'your password')}
          onChangeText={onChangePassword}
        />
        <View style={{ marginTop: styles.oneSpace, flexDirection: 'row' }}>
          {!testResult && <H2kButton onPress={handleTest}>{t('screens.settings.accountsQRZ.checkCredentials', 'Check Credentials')}</H2kButton>}
          {testResult && <H2kMarkdown style={{ flex: 1, marginTop: styles.oneSpace * 0.6 }}>{testResult}</H2kMarkdown>}
        </View>
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
        <H2kButton onPress={handleAccept}>{t('general.buttons.ok', 'Ok')}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
