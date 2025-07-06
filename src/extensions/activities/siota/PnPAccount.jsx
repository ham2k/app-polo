/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024-2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, List, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setAccountInfo } from '../../../store/settings'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'
import CallsignInput from '../../../screens/components/CallsignInput'
import { Ham2kListItem } from '../../../screens/components/Ham2kListItem'
import { Ham2kDialog } from '../../../screens/components/Ham2kDialog'

export function PnPAccountSetting ({ settings, styles }) {
  const [currentDialog, setCurrentDialog] = useState()
  return (
    <React.Fragment>
      <Ham2kListItem
        title="ParksnPeaks (SiOTA spotting)"
        description={settings?.accounts?.pnp?.userId ? `Username: ${settings.accounts.pnp.userId}` : 'No account'}
        left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="web" />}
        onPress={() => setCurrentDialog('accountsPnP')}
      />
      {currentDialog === 'accountsPnP' && (
        <AccountsPnPDialog
          settings={settings}
          styles={styles}
          visible={true}
          onDialogDone={() => setCurrentDialog('')}
        />
      )}
    </React.Fragment>
  )
}

function AccountsPnPDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [userId, setUserId] = useState('')
  const [apiKey, setAPIKey] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setUserId(settings?.accounts?.pnp?.userId || '')
    setAPIKey(settings?.accounts?.pnp?.apiKey || '')
  }, [settings])

  const onChangeUserId = useCallback((text) => {
    setUserId(text)
  }, [setUserId])
  const onChangeAPIKey = useCallback((text) => {
    setAPIKey(text)
  }, [setAPIKey])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ pnp: { userId, apiKey } }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [userId, apiKey, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setUserId(settings?.accounts?.pnp?.userId || '')
    setAPIKey(settings?.accounts?.pnp?.apiKey || '')
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>ParksnPeaks Account</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium">Please enter the details for your ParksnPeaks account:</Text>
        <CallsignInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={userId}
          label="Callsign"
          placeholder="your account callsign"
          onChangeText={onChangeUserId}
        />
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={apiKey}
          label="API Key (not password)"
          autoComplete="current-password"
          keyboardType="default"
          textContentType="password"
          secureTextEntry={true}
          autoCapitalize={'none'}
          placeholder="your API Key"
          onChangeText={onChangeAPIKey}
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
