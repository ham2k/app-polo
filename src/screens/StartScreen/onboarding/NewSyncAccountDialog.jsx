/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Dialog, Switch, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { Ham2kDialog } from '../../components/Ham2kDialog'
import EmailInput from '../../components/EmailInput'
import { findHooks } from '../../../extensions/registry'
import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { View } from 'react-native'

export function NewSyncAccountDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const dispatch = useDispatch()

  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const [email, setEmail] = useState(lofiData?.account?.email ?? '')
  const [errors, setErrors] = useState({})

  const syncHook = useMemo(() => {
    return findHooks('sync')[0]
  }, [])

  const onChangeText = useCallback((text) => {
    setEmail(text)
  }, [setEmail])

  useEffect(() => {
    if (lofiData?.enabled === undefined) {
      // Default to enabled, if there are no previous settings
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: true }))
    }
  }, [dispatch, lofiData?.enabled])

  const handleNext = useCallback(async () => {
    if (lofiData?.enabled) {
      const result = await dispatch(syncHook.linkClient(email))
      console.log('result', result)
      if (result.ok) {
        dispatch(setLocalExtensionData({ key: 'ham2k-lofi', account: result.json.account }))
        onDialogNext && onDialogNext()
      } else {
        const newErrors = {
          default: [result.json.error]
        }
        Object.keys(result.json?.account_errors || {}).forEach(key => {
          newErrors[key] = result.json.account_errors[key]
        })

        setErrors(newErrors)
      }
    } else {
      onDialogNext && onDialogNext()
    }
  }, [lofiData?.enabled, dispatch, syncHook, email, settings?.operatorCall, onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <Ham2kDialog visible={true} dismissable={false}>
      <Dialog.Title style={{ textAlign: 'center' }}>Ham2K Log Filer Service</Dialog.Title>
      <Dialog.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          <Switch value={!!lofiData?.enabled} onValueChange={(v) => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: v })) } />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: !lofiData?.enabled }))}>
            Enable Cloud Sync and Backups
          </Text>
        </View>

        {errors?.default?.length > 0 && (
          <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
            {errors.default.join('\n')}
          </Text>
        )}

        <EmailInput
          innerRef={ref}
          style={[styles.input, { marginTop: styles.oneSpace * 2 }]}
          value={email ?? ''}
          label="Account Email"
          placeholder="you@example.com"
          onChangeText={onChangeText}
          disabled={!lofiData.enabled}
        />
        {errors.pending_email?.length > 0 && (
          <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
            Email {errors.pending_email.join(', ')}
          </Text>
        )}
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={handlePrevious}>{previousLabel ?? 'Back'}</Button>
        <Button onPress={handleNext}>{nextLabel ?? 'Continue'}</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
