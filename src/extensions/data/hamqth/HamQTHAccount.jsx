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
import { setAccountInfo } from '../../../store/settings'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'
import CallsignInput from '../../../screens/components/CallsignInput'
import { Ham2kListItem } from '../../../screens/components/Ham2kListItem'
import { Ham2kDialog } from '../../../screens/components/Ham2kDialog'

export function HamQTHAccountSetting ({ settings, styles }) {
  const [currentDialog, setCurrentDialog] = useState()
  return (
    <React.Fragment>
      <Ham2kListItem
        title="HamQTH (for callsign lookups)"
        description={settings?.accounts?.hamqth ? `Login: ${settings.accounts.hamqth.login}` : 'No account'}
        left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="web" />}
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
    </React.Fragment>
  )
}

function AccountsHamQTHDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setLogin(settings?.accounts?.hamqth?.login || '')
    setPassword(settings?.accounts?.hamqth?.password || '')
  }, [settings])

  const onChangeLogin = useCallback((text) => {
    setLogin(text)
  }, [setLogin])
  const onChangePassword = useCallback((text) => {
    setPassword(text)
  }, [setPassword])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ hamqth: { login, password } }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [login, password, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setLogin(settings?.accounts?.hamqth?.login || '')
    setPassword(settings?.accounts?.hamqth?.password || '')
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>HamQTH Account</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium">Please enter the details for your HamQTH account:</Text>
        <CallsignInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={login}
          label="Callsign"
          placeholder="your account callsign"
          onChangeText={onChangeLogin}
        />
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
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
