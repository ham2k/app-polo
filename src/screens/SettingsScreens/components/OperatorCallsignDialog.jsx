/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'

import { setSettings } from '../../../store/settings'
import { H2kButton, H2kCallsignInput, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

export function OperatorCallsignDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 500) }, [])

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    if (settings?.operatorCall === 'N0CALL') {
      setValue('')
    } else {
      setValue(settings?.operatorCall || '')
    }
  }, [settings])

  const onChangeText = useCallback((text) => {
    setValue(text)
  }, [setValue])

  const handleAccept = useCallback(() => {
    dispatch(setSettings({ operatorCall: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [value, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(settings.operatorCall)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>Operator's Callsign</H2kDialogTitle>
      <H2kDialogContent>
        <Text variant="bodyMedium">Please enter the operator's callsign:</Text>
        <H2kCallsignInput
          innerRef={ref}
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={value ?? ''}
          label="Operator's Callsign"
          placeholder="N0CALL"
          onChangeText={onChangeText}
        />
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>Cancel</H2kButton>
        <H2kButton onPress={handleAccept}>Ok</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
