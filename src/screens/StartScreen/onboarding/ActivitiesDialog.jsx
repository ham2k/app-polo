/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, Switch, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setSettings } from '../../../store/settings'
import { View } from 'react-native'
import { Ham2kDialog } from '../../components/Ham2kDialog'

export function ActivitiesDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const dispatch = useDispatch()

  const [values, setValues] = useState('')

  useEffect(() => {
    setValues({
      'extensions/pota': settings['extensions/pota'] ?? true,
      'extensions/sota': settings['extensions/sota'] ?? false,
      'extensions/wwff': settings['extensions/wwff'] ?? false
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
    <Ham2kDialog visible={true} dismissable={false}>
      <Dialog.Title style={{ textAlign: 'center' }}>Favorite Activities</Dialog.Title>
      <Dialog.Content>
        <Text style={{ fontSize: styles.normalFontSize, marginBottom: styles.oneSpace * 2, textAlign: 'center' }}>Are you interested in any of these popular activation programs?</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          <Switch value={values['extensions/pota']} onValueChange={(value) => setValues({ ...values, 'extensions/pota': value }) } />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, 'extensions/pota': !values['extensions/pota'] })}>
            Parks On The Air
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace, marginTop: styles.oneSpace }}>
          <Switch value={values['extensions/sota']} onValueChange={(value) => setValues({ ...values, 'extensions/sota': value }) } />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, 'extensions/sota': !values['extensions/sota'] })}>
            Summits On The Air
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace, marginTop: styles.oneSpace }}>
          <Switch value={values['extensions/wwff']} onValueChange={(value) => setValues({ ...values, 'extensions/wwff': value }) } />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, 'extensions/wwff': !values['extensions/wwff'] })}>
            Worldwide Fauna & Flora
          </Text>
        </View>
        <Text style={{ fontSize: styles.normalFontSize, marginTop: styles.oneSpace * 2, textAlign: 'center' }}>(You can find more options in the Settings, under 'App Features')</Text>
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={handlePrevious}>{previousLabel ?? 'Back'}</Button>
        <Button onPress={handleNext}>{nextLabel ?? 'Continue'}</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
