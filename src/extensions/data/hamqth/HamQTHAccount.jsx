/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
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
import { apiHamQTH } from '../../../store/apis/apiHamQTH'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kListItem, H2kMarkdown, H2kText, H2kTextInput } from '../../../ui'
import { resetCallLookupCache } from '../../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/useCallLookup'

export function HamQTHAccountSetting ({ settings, styles }) {
  const { t } = useTranslation()

  const [currentDialog, setCurrentDialog] = useState()
  return (
    <>
      <H2kListItem
        title={t('extensions.hamqth.account.title', 'HamQTH (for callsign lookups)')}
        description={settings?.accounts?.hamqth ? t('extensions.hamqth.account.description', 'Login: {{login}}', { login: settings.accounts.hamqth.login }) : t('extensions.hamqth.account.noAccount', 'No account')}
        leftIcon={'web'}
        onPress={() => setCurrentDialog('accountsHamQTH')}
      />
      {currentDialog === 'accountsHamQTH' && (
        <AccountsHamQTHDialog
          settings={settings}
          styles={styles}
          visible={true}
          onDialogDone={() => setCurrentDialog('')}
        />
      )}
    </>
  )
}

function AccountsHamQTHDialog ({ visible, settings, styles, onDialogDone }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [originalValues] = useState({
    login: settings?.accounts?.hamqth?.login || '',
    password: settings?.accounts?.hamqth?.password || ''
  })

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setLogin(settings?.accounts?.hamqth?.login || '')
    setPassword(settings?.accounts?.hamqth?.password || '')
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
    await dispatch(setAccountInfo({ hamqth: { login, password, session: undefined } }))

    const hamQTHPromise = await dispatch(apiHamQTH.endpoints.lookupCall.initiate({ call: callInfo.baseCall }, { forceRefetch: true }))
    await Promise.all(dispatch(apiHamQTH.util.getRunningQueriesThunk()))
    const hamQTHLookup = await dispatch((_dispatch, getState) => apiHamQTH.endpoints.lookupCall.select({ call: callInfo.baseCall })(getState()))
    hamQTHPromise.unsubscribe && hamQTHPromise.unsubscribe()

    if (hamQTHLookup?.error) {
      setTestResult(`‼️ ${hamQTHLookup?.error}`)
    } else {
      setTestResult(`✅ ${settings?.operatorCall}: ${hamQTHLookup?.data?.name}`)
    }
  }, [dispatch, login, password, settings?.operatorCall])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ hamqth: { login, password, session: undefined } }))
    dispatch(resetCallLookupCache())
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [login, password, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    dispatch(setAccountInfo({ hamqth: originalValues }))
    setLogin(originalValues.login || '')
    setPassword(originalValues.password || '')
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [originalValues, dispatch, onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('extensions.hamqth.account.dialogTitle', 'HamQTH Account')}</H2kDialogTitle>
      <H2kDialogContent>
        <H2kText variant="bodyMedium">{t('extensions.hamqth.account.pleaseEnterDetails', 'Please enter the details for your HamQTH account:')}</H2kText>
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={login}
          label={t('extensions.hamqth.account.callsignLabel', 'Callsign')}
          placeholder={t('extensions.hamqth.account.callsignPlaceholder', 'your account callsign')}
          onChangeText={onChangeLogin}
        />
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={password}
          label={t('extensions.hamqth.account.passwordLabel', 'Password')}
          autoComplete="current-password"
          keyboardType="default"
          textContentType="password"
          secureTextEntry={true}
          autoCapitalize={'none'}
          placeholder={t('extensions.hamqth.account.passwordPlaceholder', 'your password')}
          onChangeText={onChangePassword}
        />
        <View style={{ marginTop: styles.oneSpace, flexDirection: 'row' }}>
          {!testResult && <H2kButton onPress={handleTest}>{t('extensions.hamqth.account.checkCredentials', 'Check Credentials')}</H2kButton>}
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
