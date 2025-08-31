/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { Switch, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'

import { setSettings } from '../../../store/settings'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

export function ActivitiesDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const dispatch = useDispatch()

  const [values, setValues] = useState('')

  useEffect(() => {
    setValues({
      'extensions/pota': settings['extensions/pota'] ?? true,
      'extensions/sota': settings['extensions/sota'] ?? false,
      'extensions/wwff': settings['extensions/wwff'] ?? false,
      'extensions/satellites': settings['extensions/satellites'] ?? false
    })
  }, [settings])

  const handleNext = useCallback(() => {
    dispatch(setSettings(values))
    onDialogNext && onDialogNext()
  }, [values, dispatch, onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <H2kDialog visible={true} dismissable={false}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>Favorite Activities</H2kDialogTitle>
      <H2kDialogContent>
        <Text style={{ fontSize: styles.normalFontSize, marginBottom: styles.oneSpace * 2, textAlign: 'center' }}>Are you interested in any of these popular activation programs?</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          <Switch
            value={values['extensions/pota']}
            onValueChange={(value) => {
              // Workaround for Switch component not updating immediately inside Portal.
              // See https://github.com/callstack/react-native-paper/issues/4789
              setTimeout(() => {
                setValues({ ...values, 'extensions/pota': value })
              }, 10)
            }}
          />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, 'extensions/pota': !values['extensions/pota'] })}>
            Parks On The Air
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace, marginTop: styles.oneSpace }}>
          <Switch
            value={values['extensions/sota']}
            onValueChange={(value) => {
              // Workaround for Switch component not updating immediately inside Portal.
              // See https://github.com/callstack/react-native-paper/issues/4789
              setTimeout(() => {
                setValues({ ...values, 'extensions/sota': value })
              }, 10)
            }}
          />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, 'extensions/sota': !values['extensions/sota'] })}>
            Summits On The Air
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace, marginTop: styles.oneSpace }}>
          <Switch
            value={values['extensions/wwff']}
            onValueChange={(value) => {
              // Workaround for Switch component not updating immediately inside Portal.
              // See https://github.com/callstack/react-native-paper/issues/4789
              setTimeout(() => {
                setValues({ ...values, 'extensions/wwff': value })
              }, 10)
            }}
          />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, 'extensions/wwff': !values['extensions/wwff'] })}>
            Worldwide Fauna & Flora
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace, marginTop: styles.oneSpace }}>
          <Switch
            value={values['extensions/satellites']}
            onValueChange={(value) => {
              // Workaround for Switch component not updating immediately inside Portal.
              // See https://github.com/callstack/react-native-paper/issues/4789
              setTimeout(() => {
                setValues({ ...values, 'extensions/satellites': value })
              }, 10)
            }}
          />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, 'extensions/satellites': !values['extensions/satellites'] })}>
            Satellites
          </Text>
        </View>
        <Text style={{ fontSize: styles.normalFontSize, marginTop: styles.oneSpace * 2, textAlign: 'center' }}>(You can find more options in the Settings, under 'App Features')</Text>
      </H2kDialogContent>
      <H2kDialogActions style={{ justifyContent: 'space-between' }}>
        <H2kButton onPress={handlePrevious}>{previousLabel ?? 'Back'}</H2kButton>
        <H2kButton onPress={handleNext}>{nextLabel ?? 'Continue'}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
