/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { Ham2kDialog } from '../../components/Ham2kDialog'
import EmailInput from '../../components/EmailInput'
import CallsignInput from '../../components/CallsignInput'
import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'

export function SyncAccountDialog ({ visible, settings, styles, syncHook, onDialogDone }) {
  const dispatch = useDispatch()

  const callRef = useRef()
  const emailRef = useRef()

  useEffect(() => { setTimeout(() => callRef?.current?.focus(), 0) }, [])

  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

  const [dialogVisible, setDialogVisible] = useState(false)
  const [call, setCall] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setCall(lofiData?.account?.call)
    setEmail(lofiData?.account?.pending_email ?? lofiData?.account?.email)
  }, [lofiData?.account?.call, lofiData?.account?.email, lofiData?.account?.pending_email])

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
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', account: result.json.account }))
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
    setCall(lofiData.call)
    setEmail(lofiData.pending_email || lofiData.email)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [lofiData, onDialogDone])

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
