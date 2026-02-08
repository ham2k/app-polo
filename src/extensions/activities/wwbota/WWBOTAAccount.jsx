/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024-2026 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { setAccountInfo } from '../../../store/settings'
import { apiWWBOTA } from '../../../store/apis/apiWWBOTA'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kListItem, H2kMarkdown, H2kText, H2kTextInput } from '../../../ui'

export function WWBOTAAccountSetting ({ settings, styles }) {
  const { t } = useTranslation()

  const [currentDialog, setCurrentDialog] = useState()
  return (
    <>
      <H2kListItem
        title={t('extensions.wwbota.account.title', 'WWBOTA (for log upload)')}
        description={settings?.accounts?.wwbota?.login ? t('extensions.wwbota.account.description', 'Login: {{login}}', { login: settings.accounts.wwbota.login }) : t('extensions.wwbota.account.noAccount', 'No account')}
        leftIcon={'web'}
        onPress={() => setCurrentDialog('accountsWWBOTA')}
      />
      {currentDialog === 'accountsWWBOTA' && (
        <AccountsWWBOTADialog
          settings={settings}
          styles={styles}
          visible={true}
          onDialogDone={() => setCurrentDialog('')}
        />
      )}
    </>
  )
}

function AccountsWWBOTADialog ({ visible, settings, styles, onDialogDone }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [originalValues] = useState({
    login: settings?.accounts?.wwbota?.login || '',
    password: settings?.accounts?.wwbota?.password || '',
    token: settings?.accounts?.wwbota?.token
  })

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setLogin(settings?.accounts?.wwbota?.login || '')
    setPassword(settings?.accounts?.wwbota?.password || '')
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
    await dispatch(setAccountInfo({ wwbota: { login, password, token: undefined } }))

    const wwbotaPromise = await dispatch(apiWWBOTA.endpoints.logUpload.initiate([], { forceRefetch: true }))
    await Promise.all(dispatch(apiWWBOTA.util.getRunningQueriesThunk()))
    const apiResults = await dispatch((_dispatch, getState) => apiWWBOTA.endpoints.logUpload.select([])(getState()))
    wwbotaPromise.unsubscribe && wwbotaPromise.unsubscribe()

    if (apiResults?.error) {
      setTestResult(`‼️ ${t('extensions.wwbota.account.invalidCredentials', 'Invalid credentials, please try again')}`)
    } else {
      setTestResult(`✅ ${t('extensions.wwbota.account.validCredentials', 'Credentials are valid!')}`)
    }
  }, [dispatch, login, password, t])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ wwbota: { login, password, token: undefined } }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [login, password, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    dispatch(setAccountInfo({ wwbota: originalValues }))
    setLogin(originalValues.login || '')
    setPassword(originalValues.password || '')
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [originalValues, dispatch, onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('extensions.wwbota.account.dialogTitle', 'WWBOTA (log upload)')}</H2kDialogTitle>
      <H2kDialogContent>
        <H2kText variant="bodyMedium">{t('extensions.wwbota.account.pleaseEnterDetails', 'Please enter the details for your WWBOTA account:')}</H2kText>
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={login}
          label={t('extensions.wwbota.account.usernameLabel', 'Username')}
          placeholder={t('extensions.wwbota.account.usernamePlaceholder', 'your account username')}
          onChangeText={onChangeLogin}
        />
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={password}
          label={t('extensions.wwbota.account.passwordLabel', 'Password')}
          autoComplete="current-password"
          keyboardType="default"
          textContentType="password"
          secureTextEntry={true}
          autoCapitalize={'none'}
          placeholder={t('extensions.wwbota.account.passwordPlaceholder', 'your password')}
          onChangeText={onChangePassword}
        />
        <View style={{ marginTop: styles.oneSpace, flexDirection: 'row' }}>
          {!testResult && <H2kButton onPress={handleTest}>{t('extensions.wwbota.account.checkCredentials', 'Check Credentials')}</H2kButton>}
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
