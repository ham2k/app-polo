// Copyright ©️ 2026 Ronald de Heer <PA4R>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useState } from 'react'
import { Linking, View } from 'react-native'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { parseCallsign } from '@ham2k/lib-callsigns'

import { setAccountInfo } from '../../../store/settings'
import { apiQRZCALL } from '../../../store/apis/apiQRZCALL'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kListItem, H2kMarkdown, H2kText, H2kTextInput } from '../../../ui'
import { resetCallLookupCache } from '../../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/useCallLookup'

const TOKEN_PORTAL_URL = 'https://qrzcall.eu/'

export function QRZCALLAccountSetting ({ settings, styles }) {
  const { t } = useTranslation()

  const [currentDialog, setCurrentDialog] = useState()

  // Show "Token configured" with the prefix (first 12 chars) for identification,
  // never the full secret.
  const configured = !!settings?.accounts?.qrzcall?.token
  const tokenPrefix = configured ? String(settings.accounts.qrzcall.token).slice(0, 12) : ''

  return (
    <>
      <H2kListItem
        title={t('extensions.qrzcall.account.title', 'QRZCALL.EU (for callsign lookups)')}
        description={configured
          ? t('extensions.qrzcall.account.descriptionToken', 'Token: {{prefix}}…', { prefix: tokenPrefix })
          : t('extensions.qrzcall.account.noAccount', 'No token configured')}
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

  const [originalToken] = useState(settings?.accounts?.qrzcall?.token || '')
  const [token, setToken] = useState('')
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setToken(settings?.accounts?.qrzcall?.token || '')
  }, [settings])

  const onChangeToken = useCallback((text) => {
    // Whitespace creep is the #1 paste error — strip it eagerly.
    setToken(String(text || '').trim())
    setTestResult(null)
  }, [setToken])

  const openTokenPortal = useCallback(() => {
    Linking.openURL(TOKEN_PORTAL_URL).catch(() => {})
  }, [])

  const handleTest = useCallback(async () => {
    const callInfo = parseCallsign(settings?.operatorCall)

    // Persist the token so the next call sees it in the redux state.
    await dispatch(setAccountInfo({ qrzcall: { token } }))

    const promise = await dispatch(apiQRZCALL.endpoints.lookupCall.initiate({ call: callInfo.baseCall }, { forceRefetch: true }))
    await Promise.all(dispatch(apiQRZCALL.util.getRunningQueriesThunk()))
    const lookup = await dispatch((_dispatch, getState) => apiQRZCALL.endpoints.lookupCall.select({ call: callInfo.baseCall })(getState()))
    promise.unsubscribe && promise.unsubscribe()

    if (lookup?.error) {
      setTestResult(`‼️ ${lookup?.error}`)
    } else if (lookup?.data?.name) {
      setTestResult(`✅ ${settings?.operatorCall}: ${lookup?.data?.name}`)
    } else {
      setTestResult(`✅ ${settings?.operatorCall}: token accepted (callsign profile is empty)`)
    }
  }, [dispatch, token, settings?.operatorCall])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ qrzcall: { token } }))
    dispatch(resetCallLookupCache())
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [token, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    dispatch(setAccountInfo({ qrzcall: { token: originalToken } }))
    setToken(originalToken || '')
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [originalToken, dispatch, onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('extensions.qrzcall.account.dialogTitle', 'QRZCALL.EU Account')}</H2kDialogTitle>
      <H2kDialogContent>
        <H2kText variant="bodyMedium">
          {t('extensions.qrzcall.account.pleaseEnterToken',
            'Paste a Personal Access Token from your QRZCALL.EU account. Generate one at qrzcall.eu → My Profile → Account → API Tokens (requires a Data or Extra subscription).')}
        </H2kText>
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace, fontFamily: 'monospace' }]}
          value={token}
          label={t('extensions.qrzcall.account.tokenLabel', 'API Token')}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          secureTextEntry={false}
          placeholder={'pat_…'}
          onChangeText={onChangeToken}
        />
        <View style={{ marginTop: styles.oneSpace, flexDirection: 'row', flexWrap: 'wrap' }}>
          <H2kButton onPress={openTokenPortal} mode="text">
            {t('extensions.qrzcall.account.openPortal', 'Open qrzcall.eu')}
          </H2kButton>
          {!testResult && token && (
            <H2kButton onPress={handleTest}>
              {t('extensions.qrzcall.account.checkCredentials', 'Check Token')}
            </H2kButton>
          )}
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
