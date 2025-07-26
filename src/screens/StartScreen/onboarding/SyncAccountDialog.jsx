/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Switch, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'

import { findHooks } from '../../../extensions/registry'
import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { setSettings } from '../../../store/settings'
import { selectFiveSecondsTick, startTickTock } from '../../../store/time'
import { View } from 'react-native'
import H2kEmailInput from '../../../ui/react-native/H2kEmailInput'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

export function SyncAccountDialog ({ inputMode, settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(startTickTock())
  }, [dispatch])

  const tick = useSelector(selectFiveSecondsTick)

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 500) }, [])

  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))
  const [status, setStatus] = useState('input')
  const [email, setEmail] = useState(lofiData?.account?.email ?? '')

  useEffect(() => {
    if (lofiData?.enabled === undefined) {
      // Default to enabled, if there are no previous settings
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: true }))
    }
  }, [dispatch, lofiData?.enabled])

  const syncHook = useMemo(() => {
    return findHooks('sync')[0]
  }, [])

  const onChangeText = useCallback((text) => {
    setEmail(text)
  }, [setEmail])

  const handleNext = useCallback(async () => {
    if (lofiData?.enabled) {
      if (status === 'input') {
        dispatch(setLocalExtensionData({ key: 'ham2k-lofi', account: { ...lofiData?.account, email } }))
        const result = await dispatch(syncHook.linkClient(email))
        if (result.ok) {
          setStatus('pending')
        }
      }
    } else {
      setStatus('input')
      onDialogNext && onDialogNext()
    }
  }, [lofiData?.enabled, lofiData?.account, status, dispatch, email, syncHook, onDialogNext])

  useEffect(() => {
    console.log('tick effect', tick, status)
    if (status === 'pending') {
      setImmediate(async () => {
        const results = await dispatch(syncHook.getAccountData())
        console.log('results', results)
        if (results?.json?.current_account?.email) {
          console.log('EMAIL!!!')
          if (Object.keys(results.json?.settings ?? {}).length > 1) {
            dispatch(setSettings(results.json.settings))
          } else if (Object.keys(results.json?.suggested_settings ?? {}).length > 1) {
            dispatch(setSettings(results.json.suggested_settings))
          }
          setStatus('input')
          onDialogNext && onDialogNext()
        }
      })
    }
  }, [dispatch, syncHook, status, tick, onDialogNext])

  const handlePrevious = useCallback(() => {
    if (status === 'input') {
      onDialogPrevious && onDialogPrevious()
    } else {
      setStatus('input')
    }
  }, [onDialogPrevious, status])

  return (
    <H2kDialog visible={true} dismissable={false}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>Ham2K Log Filer</H2kDialogTitle>
      <H2kDialogContent>
        {status === 'input' && (
          <>
            {inputMode === 'existing' ? (
              <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
                Connect with an existing account:
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
                <Switch value={!!lofiData?.enabled} onValueChange={(v) => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: v })) } />
                <Text style={{ fontSize: styles.normalFontSize }} onPress={() => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: !lofiData?.enabled }))}>
                  Enable Cloud Sync and Backups
                </Text>
              </View>
            )}

            <H2kEmailInput
              innerRef={ref}
              style={[styles.input, { marginTop: styles.oneSpace * 2 }]}
              value={email ?? ''}
              label="Account Email"
              placeholder="you@example.com"
              onChangeText={onChangeText}
              disabled={!lofiData.enabled}
            />
          </>
        )}
        {status === 'pending' && (
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

      </H2kDialogContent>
      <H2kDialogActions style={{ justifyContent: 'space-between' }}>
        <H2kButton onPress={handlePrevious}>{previousLabel ?? 'Back'}</H2kButton>
        <H2kButton onPress={handleNext} disabled={status === 'pending'}>{status === 'pending' ? 'Waiting...' : 'Continue'}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
