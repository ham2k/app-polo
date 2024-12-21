/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { selectExtensionSettings, setExtensionSettings } from '../../../store/settings'
import { Ham2kDialog } from '../../components/Ham2kDialog'
import EmailInput from '../../components/EmailInput'
import CallsignInput from '../../components/CallsignInput'

export function SyncAccountDialog ({ visible, settings, styles, syncHook, onDialogDone }) {
  const dispatch = useDispatch()

  const callRef = useRef()
  const emailRef = useRef()

  useEffect(() => { setTimeout(() => callRef?.current?.focus(), 0) }, [])

  const lofiSettings = useSelector(state => selectExtensionSettings(state, 'ham2k-lofi'))

  const [dialogVisible, setDialogVisible] = useState(false)
  const [call, setCall] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setCall(lofiSettings?.account?.call)
    setEmail(lofiSettings?.account?.pending_email ?? lofiSettings?.account?.email)
  }, [lofiSettings?.account?.call, lofiSettings?.account?.email, lofiSettings?.account?.pending_email])

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  const onChangeCall = useCallback((text) => {
    setCall(text)
  }, [setCall])

  const onChangeEmail = useCallback((text) => {
    setEmail(text)
  }, [setEmail])

  const handleAccept = useCallback(async () => {
    const result = await dispatch(syncHook.setAccountData({ pending_email: email, call }))
    console.log('result', result)
    if (result.ok) {
      dispatch(setExtensionSettings({ key: 'ham2k-lofi', account: result.json.account }))
      setDialogVisible(false)
      onDialogDone && onDialogDone()
    } else {
      const newErrors = {
        default: [result.json.error]
      }
      Object.keys(result.json?.account_errors || {}).forEach(key => {
        newErrors[key] = result.json.account_errors[key]
      })

      setErrors(newErrors)
    }
  }, [call, email, dispatch, onDialogDone, syncHook])

  const handleCancel = useCallback(() => {
    setCall(lofiSettings.call)
    setEmail(lofiSettings.pending_email || lofiSettings.email)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [lofiSettings, onDialogDone])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>Ham2K LoFi Account</Dialog.Title>
      <Dialog.Content>
        {errors?.default?.length > 0 && (
          <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
            {errors.default.join('\n')}
          </Text>
        )}
        {/* <Text variant="bodyMedium">Email Address:</Text> */}
        <CallsignInput
          innerRef={callRef}
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={call ?? ''}
          label="Callsign"
          placeholder="N0CALL"
          onChangeText={onChangeCall}
        />
        {errors.call?.length > 0 && (
          <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
            Callsign {errors.call.join(', ')}
          </Text>
        )}
        <EmailInput
          innerRef={emailRef}
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={email ?? ''}
          label="Email Address"
          placeholder="you@example.com"
          onChangeText={onChangeEmail}
        />
        {errors.pending_email?.length > 0 && (
          <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
            Email {errors.pending_email.join(', ')}
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
