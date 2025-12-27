/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { RadioButton, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'
import { setSettings } from '../../../store/settings'

export function ThemeDialog({ visible, settings, styles, onDialogDone }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(settings?.theme || 'auto')
  }, [settings])

  const handleAccept = useCallback(() => {
    dispatch(setSettings({ theme: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [value, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(settings.theme)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.generalSettings.theme.dialogTitle', 'Theme')}</H2kDialogTitle>
      <H2kDialogContent>
        <RadioButton.Group
          onValueChange={(v) => setValue(v)}
          value={value}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="light" />
            <Text onPress={() => setValue('light')} style={[styles.rowText, { flex: 1 }]}>{t('screens.generalSettings.theme.descriptionLight', 'Always in Light Mode')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="dark" />
            <Text onPress={() => setValue('dark')} style={[styles.rowText, { flex: 1 }]}>{t('screens.generalSettings.theme.descriptionDark', 'Always in Dark Mode')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="auto" />
            <Text onPress={() => setValue('auto')} style={[styles.rowText, { flex: 1 }]}>{t('screens.generalSettings.theme.descriptionDevice', 'Same as Device Theme')}</Text>
          </View>
        </RadioButton.Group>
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
        <H2kButton onPress={handleAccept}>{t('general.buttons.ok', 'Ok')}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
