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
import { setSystemFlag } from '../../../store/system'

export function ConsentDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const dispatch = useDispatch()

  const [values, setValues] = useState('')

  useEffect(() => {
    setValues({
      consentAppData: settings.consentAppData ?? true,
      consentOpData: settings.consentOpData ?? false
    })
  }, [settings])

  const handleNext = useCallback(() => {
    dispatch(setSettings(values))
    dispatch(setSystemFlag('viewedConsentDialogOn', Date.now()))

    onDialogNext && onDialogNext()
  }, [values, dispatch, onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <Dialog visible={true} dismissable={false}>
      <Dialog.Title style={{ textAlign: 'center' }}>Data & Privacy</Dialog.Title>
      <Dialog.Content>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'left', marginBottom: styles.oneSpace * 2, marginTop: styles.oneSpace * 2 }}>
          To help us make the app better, we'd like to collect performance, crash, and app usage data.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          <Switch value={values.consentAppData} onValueChange={(value) => setValues({ ...values, consentAppData: value }) } />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, consentAppData: !values.consentAppData })}>
            Share Usage Data
          </Text>
        </View>

        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'left', marginBottom: styles.oneSpace * 2, marginTop: styles.oneSpace * 4 }}>
          Some features might involve sharing your operation data with other users. You can opt-out at any time.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          <Switch value={values.consentOpData} onValueChange={(value) => setValues({ ...values, consentOpData: value }) } />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, consentOpData: !values.consentOpData })}>
            Share Operation Data
          </Text>
        </View>
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={handlePrevious}>{previousLabel ?? 'Back'}</Button>
        <Button onPress={handleNext}>{nextLabel ?? 'Next'}</Button>
      </Dialog.Actions>
    </Dialog>
  )
}
