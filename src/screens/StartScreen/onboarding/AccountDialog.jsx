/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { Ham2kDialog } from '../../components/Ham2kDialog'
import EmailInput from '../../components/EmailInput'
import { findHooks } from '../../../extensions/registry'
import { selectLocalExtensionData } from '../../../store/local'

export function AccountDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const dispatch = useDispatch()

  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const [value, setValue] = useState(lofiData?.account?.email ?? '')

  const syncHook = useMemo(() => {
    return findHooks('sync')[0]
  }, [])

  useEffect(() => {
    setImmediate(async () => {
      if (syncHook) {
        const results = await dispatch(syncHook.getAccountData())
        if (results?.json?.current_account?.email) {
          onDialogNext && onDialogNext()
        }
        console.log(results)
      } else {
        console.log('no sync hook')
        onDialogPrevious && onDialogPrevious()
      }
    })
  }, [dispatch, onDialogNext, onDialogPrevious, syncHook])

  const onChangeText = useCallback((text) => {
    setValue(text)
  }, [setValue])

  const handleNext = useCallback(() => {
    dispatch(syncHook.linkClient(value))

    onDialogNext && onDialogNext()
  }, [dispatch, syncHook, value, onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <Ham2kDialog visible={true} dismissable={false}>
      <Dialog.Title style={{ textAlign: 'center' }}>Ham2K Log Filer</Dialog.Title>
      <Dialog.Content>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
          Connect with an existing account:
        </Text>
        <EmailInput
          innerRef={ref}
          style={[styles.input, { marginTop: styles.oneSpace * 2 }]}
          value={value ?? ''}
          label="Account Email"
          placeholder="you@example.com"
          onChangeText={onChangeText}
        />
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={handlePrevious}>{previousLabel ?? 'Back'}</Button>
        <Button onPress={handleNext}>{nextLabel ?? 'Connect'}</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
