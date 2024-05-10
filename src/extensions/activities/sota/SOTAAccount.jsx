/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, List, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { authorize, logout } from 'react-native-app-auth'

import { setAccountInfo } from '../../../store/settings'
import { Ham2kListItem } from '../../../screens/components/Ham2kListItem'
import { Ham2kDialog } from '../../../screens/components/Ham2kDialog'
import { SOTASSOConfig, useAccountQuery } from './apiSOTA'

export function SOTAAccountSetting ({ settings, styles }) {
  const [currentDialog, setCurrentDialog] = useState()
  const accountQueryResults = useAccountQuery(undefined, { skip: !settings?.accounts?.sota?.idToken })
  return (
    <React.Fragment>
      <Ham2kListItem
        title="SOTA (for SOTAWatch self-spotting)"
        description={settings?.accounts?.sota?.idToken ? `Logged in as ${accountQueryResults.data?.attributes?.Callsign?.[0] || '…'}` : 'No account'}
        left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="web" />}
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
    <Ham2kDialog visible={dialogVisible} onDismiss={handleClose}>
      <Dialog.Title style={{ textAlign: 'center' }}>SOTA Account</Dialog.Title>
      {!accountQueryResults.isUninitialized ? (
        <Dialog.Content>
          {(accountQueryResults.isLoading || accountQueryResults.isSuccess) ? (
            <Text style={{ textAlign: 'center' }} variant="bodyMedium">Logged in as {accountQueryResults.data?.attributes?.Callsign?.[0] || '…' }</Text>
          ) : (
            <Text style={{ textAlign: 'center' }} variant="bodyMedium">Error fetching account details</Text>
          )}
          <Button style={{ marginTop: styles.oneSpace * 2 }} mode="contained" onPress={handleLogout}>Logout</Button>
        </Dialog.Content>
      ) : (
        <Dialog.Content>
          <Text style={{ textAlign: 'center' }} variant="bodyMedium">Connect your SOTA account</Text>
          <Button style={{ marginTop: styles.oneSpace * 2 }} mode="contained" onPress={handleLogin}>Login</Button>
        </Dialog.Content>
      )}
      <Dialog.Actions>
        <Button onPress={handleClose}>Close</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
