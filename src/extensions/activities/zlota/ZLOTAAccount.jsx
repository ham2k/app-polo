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

export function ZLOTAAccountSetting ({ settings, styles }) {
  const [currentDialog, setCurrentDialog] = useState()
  return (
    <React.Fragment>
      <Ham2kListItem
        title="ZLOTA (ZLOTA spotting)"
        description={settings?.accounts?.zlota?.userId ? `Callsign: ${settings.accounts.zlota.userId}` : 'No account'}
        left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="web" />}
        onPress={() => setCurrentDialog('accountsZLOTA')}
      />
      {currentDialog === 'accountsZLOTA' && (
        <AccountsZLOTADialog
          settings={settings}
          styles={styles}
          visible={true}
          onDialogDone={() => setCurrentDialog('')}
        />
      )}
    </React.Fragment>
  )
}

function AccountsZLOTADialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [userId, setUserId] = useState('')
  const [pin, setPin] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setUserId(settings?.accounts?.zlota?.userId || '')
    setPin(settings?.accounts?.zlota?.pin || '')
  }, [settings])

  const onChangeUserId = useCallback((text) => {
    setUserId(text)
  }, [setUserId])
  const onChangePin = useCallback((text) => {
    setPin(text)
  }, [setPin])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ zlota: { userId, pin } }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [userId, pin, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setUserId(settings?.accounts?.zlota?.userId || '')
    setPin(settings?.accounts?.zlota?.pin || '')
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>ZLOTA Account</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium">Please enter the details for your ZLOTA account:</Text>
        <CallsignInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={userId}
          label="Callsign"
          placeholder="your account callsign"
          onChangeText={onChangeUserId}
        />
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={pin}
          label="PIN (not password)"
          autoComplete="current-password"
          keyboardType="default"
          textContentType="password"
          secureTextEntry={true}
          autoCapitalize={'none'}
          placeholder="your PIN"
          onChangeText={onChangePin}
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
