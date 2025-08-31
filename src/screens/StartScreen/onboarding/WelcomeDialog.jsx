/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Text } from 'react-native-paper'

import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'
import { findHooks } from '../../../extensions/registry'
import { useDispatch } from 'react-redux'
import { setSettings } from '../../../store/settings'
import { resetDatabase } from '../../../store/db/db'

export function WelcomeDialog ({ settings, styles, onDialogNext, onDialogPrevious, onAccountConnect, nextLabel, previousLabel }) {
  const dispatch = useDispatch()
  const [existingAccount, setExistingAccount] = useState()
  const [accountData, setAccountData] = useState()
  const syncHook = useMemo(() => {
    return findHooks('sync')[0]
  }, [])

  useEffect(() => {
    setImmediate(async () => {
      const results = await dispatch(syncHook.getAccountData())
      console.log('account data', results)
      if (results.ok) {
        const json = results.json
        if (json?.current_account?.email || json?.settings?.operatorCall) {
          setExistingAccount(json?.current_account)
        }
        setAccountData(json)
      }
    })
  }, [syncHook, dispatch])

  const handleNext = useCallback(() => {
    if (existingAccount) {
      setImmediate(async () => {
        await dispatch(syncHook.resetClient())
        onDialogNext && onDialogNext()
      })
    } else {
      onDialogNext && onDialogNext()
    }
  }, [dispatch, existingAccount, onDialogNext, syncHook])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  const handleConnect = useCallback(() => {
    if (existingAccount) {
      setImmediate(async () => {
        if (Object.keys(accountData?.settings ?? {}).length > 1) {
          await dispatch(setSettings(accountData.settings))
        } else if (Object.keys(accountData?.suggested_settings ?? {}).length > 1) {
          await dispatch(setSettings(accountData.suggested_settings))
        }
        onAccountConnect && onAccountConnect()
      })
    } else {
      onAccountConnect && onAccountConnect()
    }
  }, [accountData, dispatch, existingAccount, onAccountConnect])

  const handleReset = useCallback(() => {
    setImmediate(async () => {
      await dispatch(syncHook.resetClient())
      await resetDatabase()
    })
    onDialogPrevious && onDialogPrevious()
  }, [dispatch, onDialogPrevious, syncHook])

  if (settings.devMode && existingAccount) {
    return (
      <H2kDialog visible={true} dismissable={false}>
        <H2kDialogTitle style={{ textAlign: 'center' }}>Welcome to PoLo!</H2kDialogTitle>
        <H2kDialogContent>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
            This device is linked to an existing Ham2K Log Filer account:
          </Text>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
            {existingAccount.email ?? `#${existingAccount.uuid.slice(0, 8).toUpperCase()}`}
          </Text>
          <H2kButton onPress={handleConnect}>
            Connect with Account
          </H2kButton>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center', paddingTop: styles.oneSpace * 2 }}>
            Or if you prefer, you can…
          </Text>
          <H2kButton onPress={handleReset}>
            Reset and Setup from Scratch
          </H2kButton>
        </H2kDialogContent>
      </H2kDialog>
    )
  } else {
    return (
      <H2kDialog visible={true} dismissable={false}>
        <H2kDialogTitle style={{ textAlign: 'center' }}>Welcome to PoLo!</H2kDialogTitle>
        <H2kDialogContent>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
            We have a few questions to help us better suit your needs.
          </Text>
        </H2kDialogContent>
        <H2kDialogActions style={{ justifyContent: 'space-between' }}>
          <H2kButton onPress={handlePrevious}>{previousLabel ?? 'Skip'}</H2kButton>
          <H2kButton onPress={handleNext}>{nextLabel ?? 'Continue'}</H2kButton>
        </H2kDialogActions>
      </H2kDialog>
    )
  }
}
