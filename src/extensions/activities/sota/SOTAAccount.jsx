/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { authorize, logout } from 'react-native-app-auth'

import { setAccountInfo } from '../../../store/settings'
import { SOTASSOConfig, useAccountQuery } from '../../../store/apis/apiSOTA'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kListItem, H2kText } from '../../../ui'
import { useTranslation } from 'react-i18next'

export function SOTAAccountSetting ({ settings, styles }) {
  const { t } = useTranslation()

  const [currentDialog, setCurrentDialog] = useState()
  const accountQueryResults = useAccountQuery(undefined, { skip: !settings?.accounts?.sota?.idToken })
  return (
    <React.Fragment>
      <H2kListItem
        title={t('extensions.sota.account.title', 'SOTA (for SOTAWatch self-spotting)')}
        description={settings?.accounts?.sota?.idToken
          ? t('extensions.sota.account.description', 'Logged in as {{callsign}}', { callsign: accountQueryResults.data?.attributes?.Callsign?.[0] || '…' })
          : t('extensions.sota.account.noAccount', 'No account')
        }
        leftIcon="web"
        onPress={() => setCurrentDialog('accountsSOTA')}
      />
      {currentDialog === 'accountsSOTA' && (
        <AccountsSOTADialog
          settings={settings}
          styles={styles}
          visible={true}
          onDialogDone={() => setCurrentDialog('')}
        />
      )}
    </React.Fragment>
  )
}

export function AccountsSOTADialog ({ visible, settings, styles, onDialogDone }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  const handleClose = useCallback(() => {
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone])

  const handleLogin = useCallback(async () => {
    try {
      const result = await authorize(SOTASSOConfig)
      dispatch(setAccountInfo({
        sota: {
          idToken: result.idToken,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      }))
    } catch (error) {
      console.log(error)
    }
  }, [dispatch])

  const handleLogout = useCallback(async () => {
    try {
      await logout(
        { issuer: SOTASSOConfig.issuer },
        { idToken: settings.accounts.sota.idToken, postLogoutRedirectUrl: SOTASSOConfig.redirectUrl }
      )
    } catch (error) {
      console.log('error', error)
    }
    // Assume successful, delete info
    dispatch(setAccountInfo({ sota: { idToken: undefined } }))
  }, [dispatch, settings.accounts?.sota?.idToken])

  const accountQueryResults = useAccountQuery(undefined, { skip: !settings?.accounts?.sota?.idToken })

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleClose}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('extensions.sota.account.dialogTitle', 'SOTA Account')}</H2kDialogTitle>
      {!accountQueryResults.isUninitialized ? (
        <H2kDialogContent>
          {(accountQueryResults.isLoading || accountQueryResults.isSuccess) ? (
            <H2kText style={{ textAlign: 'center' }} variant="bodyMedium">{t('extensions.sota.account.description', 'Logged in as {{callsign}}', { callsign: accountQueryResults.data?.attributes?.Callsign?.[0] || '…' })}</H2kText>
          ) : (
            <H2kText style={{ textAlign: 'center' }} variant="bodyMedium">{t('extensions.sota.account.error', 'Error fetching account details')}</H2kText>
          )}
          <H2kButton style={{ marginTop: styles.oneSpace * 2 }} mode="contained" onPress={handleLogout}>{t('extensions.sota.account.logout', 'Logout')}</H2kButton>
        </H2kDialogContent>
      ) : (
        <H2kDialogContent>
          <H2kText style={{ textAlign: 'center' }} variant="bodyMedium">{t('extensions.sota.account.connect', 'Connect your SOTA account')}</H2kText>
          <H2kButton style={{ marginTop: styles.oneSpace * 2 }} mode="contained" onPress={handleLogin}>{t('general.buttons.login', 'Login')}</H2kButton>
        </H2kDialogContent>
      )}
      <H2kDialogActions>
        <H2kButton onPress={handleClose}>{t('general.buttons.close', 'Close')}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
