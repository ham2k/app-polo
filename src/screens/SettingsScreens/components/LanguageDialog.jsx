/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { RadioButton, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogScrollArea, H2kDialogTitle } from '../../../ui'
import { setSettings } from '../../../store/settings'
import { bestLanguageMatch, preferredLanguage, refreshCrowdInTranslations, supportedLanguages } from '../../../i18n/i18n'

export function LanguageDialog ({ visible, settings, styles, onDialogDone }) {
  const { t, i18n } = useTranslation()

  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState(settings?.language || 'default')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(settings?.language || 'default')
  }, [settings])

  const [languages, setLanguages] = useState(supportedLanguages())

  const { message, bestMatch } = useMemo(() => {
    const _preferred = preferredLanguage()
    const _bestMatch = bestLanguageMatch()

    let _message = ''
    if (_bestMatch === undefined) {
      _message = t('screens.generalSettings.language.notSupported-md', '{{lang}} (Device Settings) is not currently supported.',
        {
          lang: t(`general.languages.names.${_preferred}`, `[${_preferred}]`),
          langCode: _preferred
        }
      )
    }
    return { message: _message, preferred: _preferred, bestMatch: _bestMatch || 'en' }
  }, [t])

  const handleAccept = useCallback(() => {
    dispatch(setSettings({ language: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [value, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(settings.language)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  const handleRefreshTranslations = useCallback(() => {
    setImmediate(async () => {
      await refreshCrowdInTranslations({ all: false, i18n, settings, dispatch, token: settings.crowdInPersonalToken })
      setLanguages(supportedLanguages())
    })
  }, [settings, dispatch, i18n])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.generalSettings.language.dialogTitle', 'Language')}</H2kDialogTitle>
      <H2kDialogContent>
        <Text style={[styles.rowText, { textAlign: 'center', alignSelf: 'stretch', marginBottom: styles.oneSpace * 2 }]}>
          {t('screens.generalSettings.language.dialogDescription', 'Change the language')}
        </Text>

        {message && (
          <Text style={[styles.rowText, { textAlign: 'center', alignSelf: 'stretch', marginBottom: styles.oneSpace * 2 }]}>{message}</Text>
        )}
      </H2kDialogContent>
      <H2kDialogScrollArea>
        <RadioButton.Group
          onValueChange={(v) => setValue(v)}
          value={value}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value={'default'} />
            <Text onPress={() => setValue('default')} style={[styles.rowText, { flex: 1 }]}>{
              t('screens.generalSettings.language.deviceDefault', 'Device Default ({{lang}} [{{langCode}}])', {
                lang: t(`general.languages.names.${bestMatch}`, `[${bestMatch}]`),
                langCode: bestMatch
              })
            }</Text>
          </View>

          {languages.map((lang) => (
            <View key={lang} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <RadioButton value={lang} />
              <Text onPress={() => setValue(lang)} style={[styles.rowText, { flex: 1 }]}>{
                t('screens.generalSettings.language.optionText', '{{lang}} [{{langCode}}]', {
                  lang: t(`general.languages.names.${lang}`, `[${lang}]`),
                  langCode: lang
                })
              }</Text>
            </View>
          ))}
        </RadioButton.Group>
      </H2kDialogScrollArea>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
        {settings.devMode && settings.crowdInPersonalToken && (
          <H2kButton themeColor={'devMode'} onPress={handleRefreshTranslations}>{t('general.buttons.refresh', 'Refresh')}</H2kButton>
        )}
        <H2kButton onPress={handleAccept}>{t('general.buttons.ok', 'Ok')}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
