/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { Ham2kDialog } from '../../components/Ham2kDialog'
import { findHooks } from '../../../extensions/registry'
import { selectLocalExtensionData } from '../../../store/local'

export function AccountVerificationDialog ({ settings, styles, onDialogNext, onDialogPrevious, onAccountReady, nextLabel, previousLabel }) {
  const dispatch = useDispatch()

  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

  const [status, setStatus] = useState(undefined)

  const syncHook = useMemo(() => {
    return findHooks('sync')[0]
  }, [])

  useEffect(() => {
    if (status === undefined) {
      setStatus('pendingApproval')
      setImmediate(async () => {
        const results = await dispatch(syncHook.getAccountData())
        if (results?.current_account?.email) {
          setStatus('linking')
        }
      })
    }
  }, [dispatch, syncHook, status])

  const handleNext = useCallback(() => {
    if (status === 'ready') {
      onAccountReady && onAccountReady()
    }
  }, [status, onAccountReady])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <Ham2kDialog visible={true} dismissable={false}>
      <Dialog.Title style={{ textAlign: 'center' }}>Confirming Account!</Dialog.Title>
      <Dialog.Content>
        {status === 'pendingApproval' && (
          <>
            <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
              We have sent a message to
            </Text>
            <Text style={[{ fontSize: styles.normalFontSize, textAlign: 'center', paddingVertical: styles.oneSpace }, styles.text.bold]}>
              {lofiData?.account?.email}
            </Text>
            <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
              in order to link this device with the account.
            </Text>
            <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center', paddingTop: styles.oneSpace * 2 }}>
              Check your email for a message from Ham2K to complete the process.
            </Text>
          </>
        )}
        {status === 'linking' && (
          <>
            <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
              We're linking this device
            </Text>
            <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
              with your {lofiData?.account?.email} account…
            </Text>
          </>
        )}
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={handlePrevious}>{previousLabel ?? 'Back'}</Button>
        <Button onPress={handleNext} disabled={status !== 'ready'}>{status === 'ready' ? 'Continue' : 'Waiting...'}</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
