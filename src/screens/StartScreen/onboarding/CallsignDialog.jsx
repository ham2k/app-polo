/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Text } from 'react-native-paper'
import RNRestart from 'react-native-restart'
import { useTranslation } from 'react-i18next'

import { setSettings } from '../../../store/settings'
import { persistor } from '../../../store'
import { H2kButton, H2kCallsignInput, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

export function CallsignDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 500) }, [])

  const [value, setValue] = useState('')
  console.log('settings', settings)
  useEffect(() => {
    if (settings?.operatorCall === t('general.misc.placeholderCallsign', 'N0CALL')) {
      setValue('')
    } else {
      setValue(settings?.operatorCall || '')
    }
  }, [settings, t])

  const onChangeText = useCallback((text) => {
    setValue(text)
  }, [setValue])

  const handleNext = useCallback(() => {
    if (value === 'DEVMODE' || value === 'KONAMI') {
      setImmediate(async () => {
        await dispatch(setSettings({ devMode: true }))
        await persistor.flush()
        setTimeout(() => RNRestart.restart(), 1000)
      })
    } else {
      dispatch(setSettings({ operatorCall: value }))
      onDialogNext && onDialogNext()
    }
  }, [value, dispatch, onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <H2kDialog visible={true} dismissable={false}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.startScreen.onboarding.whatsYourCallsign', "What's your callsign?")}</H2kDialogTitle>
      <H2kDialogContent>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
          {t('screens.startScreen.onboarding.callsignDescription', 'You need an Amateur Radio Operator License in order to find this app useful')}
        </Text>
        <H2kCallsignInput
          innerRef={ref}
          style={[styles.input, { marginTop: styles.oneSpace * 2 }]}
          value={value ?? ''}
          label={t('screens.startScreen.onboarding.callsignLabel', "Operator's Callsign")}
          placeholder={t('general.misc.placeholderCallsign', 'N0CALL')}
          onChangeText={onChangeText}
        />
      </H2kDialogContent>
      <H2kDialogActions style={{ justifyContent: 'space-between' }}>
        <H2kButton onPress={handlePrevious}>{previousLabel ?? t('general.buttons.back', 'Back')}</H2kButton>
        <H2kButton onPress={handleNext}>{nextLabel ?? t('general.buttons.next', 'Next')}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
