/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'

import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'
import H2kEmailInput from '../../../ui/react-native/H2kEmailInput'
import { View } from 'react-native'

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
    if (lofiData?.pending_link_email) {
      setEmail(lofiData?.pending_link_email)
    } else {
      setEmail(lofiData?.account?.pending_email ?? lofiData?.account?.email)
    }
  }, [lofiData?.account?.email, lofiData?.account?.pending_email, lofiData?.pending_link_email])

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  const onChangeEmail = useCallback((text) => {
    setEmail(text)
  }, [setEmail])

  const handleAccept = useCallback(async () => {
    const result = await dispatch(syncHook.setAccountData({ pending_email: email }))
    // console.log('account change result', result)
    if (result.ok) {
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', account: result.json.account, pending_email: email }))
      setDialogVisible(false)
      onDialogDone && onDialogDone()
    } else if (result.json.account_errors?.pending_email?.find(e => e.suggested_action === 'link')) {
      const linkResult = await dispatch(syncHook.linkClient(email))
      if (linkResult.ok) {
        dispatch(setLocalExtensionData({ key: 'ham2k-lofi', account: linkResult.json.account, pending_link_email: email }))
        setDialogVisible(false)
        onDialogDone && onDialogDone()
      } else {
        const newErrors = {
          default: [linkResult.json.error]
        }
        Object.keys(linkResult.json?.account_errors || {}).forEach(key => {
          newErrors[key] = linkResult.json.account_errors[key].error
        })
        setErrors(newErrors)
      }
    } else {
      const newErrors = {
        default: [result.json.error]
      }
      Object.keys(result.json?.account_errors || {}).forEach(key => {
        newErrors[key] = result.json.account_errors[key]
      })

      setErrors(newErrors)
    }
  }, [email, dispatch, onDialogDone, syncHook])

  const handleCancel = useCallback(() => {
    setEmail(lofiData.pending_link_email || lofiData.account.email)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [lofiData, onDialogDone])

  const showResend = useMemo(() => {
    const pending = (lofiData?.pending_link_email || lofiData?.account?.pending_email)
    // console.log('showResend', { pending, email })
    if (pending && pending === email) {
      return true
    } else {
      return false
    }
  }, [lofiData?.pending_link_email, lofiData?.account?.pending_email, email])

  const handleResend = useCallback(() => {
    if (lofiData?.pending_link_email) {
      dispatch(syncHook.linkClient(lofiData?.pending_link_email))
    } else {
      dispatch(syncHook.resendEmail())
    }
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [lofiData?.pending_link_email, onDialogDone, dispatch, syncHook])

  const handleRevert = useCallback(() => {
    dispatch(setLocalExtensionData({ key: 'ham2k-lofi', pending_link_email: undefined, pending_email: undefined }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [dispatch, onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>Ham2K LoFi Account</H2kDialogTitle>
      <H2kDialogContent>
        {errors?.default?.length > 0 && (
          <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
            {errors.default.map(e => e?.error || e).join('\n')}
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
            Email {errors.pending_email.map(e => e?.error || e).join(', ')}
          </Text>
        )}
      </H2kDialogContent>
      <H2kDialogActions>
        {showResend ? (
          <>
            <H2kButton onPress={handleResend} style={{ alignSelf: 'flex-start' }}>Resend</H2kButton>
            <H2kButton onPress={handleRevert} style={{ alignSelf: 'flex-start' }}>Revert</H2kButton>
          </>
        ) : (
          // Otherwise the "Ok" button jumps around!
          <View style={{ flex: 0, width: styles.oneSpace }} />
        )}
        <View style={{ flex: 1 }} />

        <H2kButton style={{ flex: 0 }} onPress={handleCancel}>Cancel</H2kButton>
        <H2kButton style={{ flex: 0 }} onPress={handleAccept}>Ok</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
