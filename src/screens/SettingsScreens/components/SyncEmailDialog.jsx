/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { selectExtensionSettings } from '../../../store/settings'
import { Ham2kDialog } from '../../components/Ham2kDialog'
import EmailInput from '../../components/EmailInput'

export function SyncEmailDialog ({ visible, settings, styles, syncHook, onDialogDone }) {
  const dispatch = useDispatch()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const lofiSettings = useSelector(state => selectExtensionSettings(state, 'ham2k-lofi'))

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')
  const [errors, setErrors] = useState([])

  useEffect(() => {
    setValue(lofiSettings?.account?.pending_email ?? lofiSettings?.account?.email)
  }, [lofiSettings?.account])

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  const onChangeText = useCallback((text) => {
    setValue(text)
  }, [setValue])

  const handleAccept = useCallback(async () => {
    const result = await dispatch(syncHook.setAccountData({ pending_email: value }))
    console.log('result', result)
    if (result.ok) {
      setDialogVisible(false)
      onDialogDone && onDialogDone()
    } else {
      const newErrors = [result.json.error]
      Object.keys(result.json?.account_errors || {}).forEach(key => {
        newErrors.push(result.json.account_errors[key].map(v => `${key === 'pending_email' ? 'email' : key} ${v}`))
      })

      setErrors(newErrors.flat().filter(Boolean))
    }
    // dispatch(setExtensionSettings({ key: 'ham2k-lofi', account: { ...lofiSettings?.account, pending_email: value }))
  }, [value, dispatch, onDialogDone, syncHook])

  const handleCancel = useCallback(() => {
    setValue(lofiSettings.email)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [lofiSettings.email, onDialogDone])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>Ham2K LoFi Account</Dialog.Title>
      <Dialog.Content>
        {/* <Text variant="bodyMedium">Email Address:</Text> */}
        <EmailInput
          innerRef={ref}
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={value ?? ''}
          label="Email Address"
          placeholder="you@example.com"
          onChangeText={onChangeText}
        />
        {errors.length > 0 && (
          <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
            {errors.join('\n')}
          </Text>
        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
