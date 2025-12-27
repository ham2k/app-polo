/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { setSettings } from '../../../store/settings'
import { H2kButton, H2kCallsignInput, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

export function OperatorCallsignDialog ({ visible, settings, styles, onDialogDone }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 500) }, [])

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    if (settings?.operatorCall === 'N0CALL' || settings?.operatorCall === t('general.misc.placeholderCallsign', 'N0CALL')) {
      setValue('')
    } else {
      setValue(settings?.operatorCall || '')
    }
  }, [settings, t])

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
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.settings.operatorCallsign.dialogTitle', 'Operator Callsign')}</H2kDialogTitle>
      <H2kDialogContent>
        <Text variant="bodyMedium">{t('screens.settings.operatorCallsign.pleaseEnterCallsign', 'Please enter the operator\'s callsign:')}</Text>
        <H2kCallsignInput
          innerRef={ref}
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={value ?? ''}
          label={t('screens.settings.operatorCallsign.callsignLabel', 'Operator\'s Callsign')}
          placeholder={t('general.misc.placeholderCallsign', 'N0CALL')}
          onChangeText={onChangeText}
        />
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
        <H2kButton onPress={handleAccept}>{t('general.buttons.ok', 'Ok')}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
