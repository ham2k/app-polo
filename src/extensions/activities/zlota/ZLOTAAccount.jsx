/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024-2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'

import { setAccountInfo } from '../../../store/settings'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kListItem, H2kText, H2kTextInput } from '../../../ui'
import H2kCallsignInput from '../../../ui/react-native/H2kCallsignInput'

export function ZLOTAAccountSetting ({ settings, styles }) {
  const [currentDialog, setCurrentDialog] = useState()
  return (
    <>
      <H2kListItem
        title="ZLOTA (ZLOTA spotting)"
        description={settings?.accounts?.zlota?.userId ? `Callsign: ${settings.accounts.zlota.userId}` : 'No account'}
        leftIcon={'web'}
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
    </>
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
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>ZLOTA Account</H2kDialogTitle>
      <H2kDialogContent>
        <H2kText variant="bodyMedium">Please enter the details for your ZLOTA account:</H2kText>
        <H2kCallsignInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={userId}
          label="Callsign"
          placeholder="your account callsign"
          onChangeText={onChangeUserId}
        />
        <H2kTextInput
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
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>Cancel</H2kButton>
        <H2kButton onPress={handleAccept}>Ok</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
