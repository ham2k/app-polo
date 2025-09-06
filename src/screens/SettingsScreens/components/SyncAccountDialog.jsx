/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'

import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'
import H2kEmailInput from '../../../ui/react-native/H2kEmailInput'

export function SyncAccountDialog ({ visible, settings, styles, syncHook, onDialogDone }) {
  const dispatch = useDispatch()

  const callRef = useRef()
  const emailRef = useRef()

  useEffect(() => { setTimeout(() => callRef?.current?.focus(), 500) }, [])

  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

  const [dialogVisible, setDialogVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setEmail(lofiData?.account?.pending_email ?? lofiData?.account?.email)
  }, [lofiData?.account?.call, lofiData?.account?.email, lofiData?.account?.pending_email])

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  const onChangeEmail = useCallback((text) => {
    setEmail(text)
  }, [setEmail])

  const handleAccept = useCallback(async () => {
    const result = await dispatch(syncHook.setAccountData({ pending_email: email }))

    if (result.ok) {
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', account: result.json.account }))
      setDialogVisible(false)
      onDialogDone && onDialogDone()
    } else {
      const newErrors = {
        default: [result.json.error]
      }
      Object.keys(result.json?.account_errors || {}).forEach(key => {
        newErrors[key] = result.json.account_errors[key].error
      })

      setErrors(newErrors)
    }
  }, [email, dispatch, onDialogDone, syncHook])

  const handleCancel = useCallback(() => {
    setEmail(lofiData.pending_email || lofiData.email)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [lofiData, onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>Ham2K LoFi Account</H2kDialogTitle>
      <H2kDialogContent>
        {errors?.default?.length > 0 && (
          <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
            {errors.default.join('\n')}
          </Text>
        )}
        <H2kEmailInput
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
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>Cancel</H2kButton>
        <H2kButton onPress={handleAccept}>Ok</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
