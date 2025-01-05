/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'
import CallsignInput from '../../components/CallsignInput'
import { useDispatch } from 'react-redux'
import { setSettings } from '../../../store/settings'
import { Ham2kDialog } from '../../components/Ham2kDialog'

export function CallsignDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const dispatch = useDispatch()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const [value, setValue] = useState('')
  console.log('settings', settings)
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

  const handleNext = useCallback(() => {
    dispatch(setSettings({ operatorCall: value }))

    onDialogNext && onDialogNext()
  }, [value, dispatch, onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <Ham2kDialog visible={true} dismissable={false}>
      <Dialog.Title style={{ textAlign: 'center' }}>What's your callsign?</Dialog.Title>
      <Dialog.Content>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
          You need an Amateur Radio Operator License in order to find this app useful
        </Text>
        <CallsignInput
          innerRef={ref}
          style={[styles.input, { marginTop: styles.oneSpace * 2 }]}
          value={value ?? ''}
          label="Operator's Callsign"
          placeholder="N0CALL"
          onChangeText={onChangeText}
        />
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={handlePrevious}>{previousLabel ?? 'Back'}</Button>
        <Button onPress={handleNext}>{nextLabel ?? 'Next'}</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
