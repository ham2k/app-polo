/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024-2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'

import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kListItem, H2kText, H2kTextInput } from '../../../ui'
import { setAccountInfo } from '../../../store/settings'

export function PnPAccountSetting ({ settings, styles }) {
  const [currentDialog, setCurrentDialog] = useState()
  return (
    <React.Fragment>
      <H2kListItem
        title="ParksnPeaks (SiOTA spotting)"
        description={settings?.accounts?.pnp?.userId ? `Username: ${settings.accounts.pnp.userId}` : 'No account'}
        leftIcon="web"
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
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>ParksnPeaks Account</H2kDialogTitle>
      <H2kDialogContent>
        <H2kText variant="bodyMedium">Please enter the details for your ParksnPeaks account:</H2kText>
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={userId}
          label="Username (not callsign)"
          placeholder="your account username"
          onChangeText={onChangeUserId}
        />
        <H2kTextInput
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
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>Cancel</H2kButton>
        <H2kButton onPress={handleAccept}>Ok</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
