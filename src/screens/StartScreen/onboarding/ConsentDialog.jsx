/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Switch, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { setSettings } from '../../../store/settings'
import { View } from 'react-native'
import { setSystemFlag } from '../../../store/system'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

export function ConsentDialog ({ settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const { t } = useTranslation()

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
    <H2kDialog visible={true} dismissable={false}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.startScreen.onboarding.dataAndPrivacy', 'Data & Privacy')}</H2kDialogTitle>
      <H2kDialogContent>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'left', marginBottom: styles.oneSpace * 2, marginTop: styles.oneSpace * 2 }}>
          {t('screens.startScreen.onboarding.shareUsageDataDescription', 'To help us make the app better, we\'d like to collect performance, crash, and app usage data.')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          <Switch
            value={values.consentAppData}
            onValueChange={(value) => {
              // Workaround for Switch component not updating immediately inside Portal.
              // See https://github.com/callstack/react-native-paper/issues/4789
              setTimeout(() => {
                setValues({ ...values, consentAppData: value })
              }, 10)
            }}
          />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, consentAppData: !values.consentAppData })}>
            {t('screens.startScreen.onboarding.shareUsageData', 'Share Usage Data')}
          </Text>
        </View>

        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'left', marginBottom: styles.oneSpace * 2, marginTop: styles.oneSpace * 4 }}>
          {t('screens.startScreen.onboarding.shareOperationDataDescription', 'Some features might involve sharing your operation data with other users. You can opt-out at any time.')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          <Switch
            value={values.consentOpData}
            onValueChange={(value) => {
              // Workaround for Switch component not updating immediately inside Portal.
              // See https://github.com/callstack/react-native-paper/issues/4789
              setTimeout(() => {
                setValues({ ...values, consentOpData: value })
              }, 10)
            }}
          />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setValues({ ...values, consentOpData: !values.consentOpData })}>
            {t('screens.startScreen.onboarding.shareOperationData', 'Share Operation Data')}
          </Text>
        </View>
      </H2kDialogContent>
      <H2kDialogActions style={{ justifyContent: 'space-between' }}>
        <H2kButton onPress={handlePrevious}>{previousLabel ?? t('general.buttons.back', 'Back')}</H2kButton>
        <H2kButton onPress={handleNext}>{nextLabel ?? t('general.buttons.next', 'Next')}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
