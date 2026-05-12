/*
 * Copyright ©️ 2026 Ronald de Heer <PA4R>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { parseCallsign } from '@ham2k/lib-callsigns'

import { setAccountInfo } from '../../../store/settings'
import { apiQRZCALL } from '../../../store/apis/apiQRZCALL'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kListItem, H2kMarkdown, H2kText, H2kTextInput } from '../../../ui'
import { resetCallLookupCache } from '../../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/useCallLookup'

export function QRZCALLAccountSetting ({ settings, styles }) {
  const { t } = useTranslation()

  const [currentDialog, setCurrentDialog] = useState()
  return (
    <>
      <H2kListItem
        title={t('extensions.qrzcall.account.title', 'QRZCALL.EU (for callsign lookups)')}
        description={settings?.accounts?.qrzcall ? t('extensions.qrzcall.account.description', 'Login: {{login}}', { login: settings.accounts.qrzcall.login }) : t('extensions.qrzcall.account.noAccount', 'No account')}
        leftIcon={'web'}
        onPress={() => setCurrentDialog('accountsQRZCALL')}
      />
      {currentDialog === 'accountsQRZCALL' && (
        <AccountsQRZCALLDialog
          settings={settings}
          styles={styles}
          visible={true}
          onDialogDone={() => setCurrentDialog('')}
        />
      )}
    </>
  )
}

function AccountsQRZCALLDialog ({ visible, settings, styles, onDialogDone }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [originalValues] = useState({
    login: settings?.accounts?.qrzcall?.login || '',
    password: settings?.accounts?.qrzcall?.password || ''
  })

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setLogin(settings?.accounts?.qrzcall?.login || '')
    setPassword(settings?.accounts?.qrzcall?.password || '')
  }, [settings])

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
    // Clear session so the next call triggers a fresh /auth/login.php
    await dispatch(setAccountInfo({ qrzcall: { login, password, session: undefined } }))

    const promise = await dispatch(apiQRZCALL.endpoints.lookupCall.initiate({ call: callInfo.baseCall }, { forceRefetch: true }))
    await Promise.all(dispatch(apiQRZCALL.util.getRunningQueriesThunk()))
    const lookup = await dispatch((_dispatch, getState) => apiQRZCALL.endpoints.lookupCall.select({ call: callInfo.baseCall })(getState()))
    promise.unsubscribe && promise.unsubscribe()

    if (lookup?.error) {
      setTestResult(`‼️ ${lookup?.error}`)
    } else if (lookup?.data?.name) {
      setTestResult(`✅ ${settings?.operatorCall}: ${lookup?.data?.name}`)
    } else {
      setTestResult(`✅ ${settings?.operatorCall}: logged in (callsign profile is empty)`)
    }
  }, [dispatch, login, password, settings?.operatorCall])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ qrzcall: { login, password, session: undefined } }))
    dispatch(resetCallLookupCache())
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [login, password, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    dispatch(setAccountInfo({ qrzcall: originalValues }))
    setLogin(originalValues.login || '')
    setPassword(originalValues.password || '')
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [originalValues, dispatch, onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('extensions.qrzcall.account.dialogTitle', 'QRZCALL.EU Account')}</H2kDialogTitle>
      <H2kDialogContent>
        <H2kText variant="bodyMedium">{t('extensions.qrzcall.account.pleaseEnterDetails', 'Please enter the details for your QRZCALL.EU account (Data or Extra subscription required for callsign data):')}</H2kText>
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={login}
          label={t('extensions.qrzcall.account.callsignLabel', 'Callsign')}
          placeholder={t('extensions.qrzcall.account.callsignPlaceholder', 'your account callsign')}
          onChangeText={onChangeLogin}
        />
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={password}
          label={t('extensions.qrzcall.account.passwordLabel', 'Password')}
          autoComplete="current-password"
          keyboardType="default"
          textContentType="password"
          secureTextEntry={true}
          autoCapitalize={'none'}
          placeholder={t('extensions.qrzcall.account.passwordPlaceholder', 'your password')}
          onChangeText={onChangePassword}
        />
        <View style={{ marginTop: styles.oneSpace, flexDirection: 'row' }}>
          {!testResult && <H2kButton onPress={handleTest}>{t('extensions.qrzcall.account.checkCredentials', 'Check Credentials')}</H2kButton>}
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
