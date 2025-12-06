/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
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
import { BASE_FONT_SIZE } from '../../../styles/globalStyles'
import { SCALE_ADJUSTMENTS } from '../../../styles/tools/computeSizes'

export function FontScaleDialog({ visible, settings, styles, onDialogDone }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(settings?.fontScale || 'md')
  }, [settings])

  const handleAccept = useCallback(() => {
    dispatch(setSettings({ fontScale: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [value, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(settings.fontScale)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.generalSettings.fontScale.dialogTitle', 'Font Scale')}</H2kDialogTitle>
      <H2kDialogContent>
        <Text style={[styles.rowText, { textAlign: 'center', alignSelf: 'stretch', marginBottom: styles.oneSpace * 2 }]}>
          {t('screens.generalSettings.fontScale.dialogDescription', 'These sizes are also affected by device settings, such as Display and Accessibility.')}
        </Text>
        <RadioButton.Group
          onValueChange={(v) => setValue(v)}
          value={value}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="xs" />
            <Text onPress={() => setValue('xs')} style={[styles.rowText, { flex: 1, fontSize: BASE_FONT_SIZE * SCALE_ADJUSTMENTS.xs, lineHeight: BASE_FONT_SIZE * SCALE_ADJUSTMENTS.xs }]}>{t('screens.generalSettings.fontScale.descriptionXS', 'Smallest')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="sm" />
            <Text onPress={() => setValue('sm')} style={[styles.rowText, { flex: 1, fontSize: BASE_FONT_SIZE * SCALE_ADJUSTMENTS.sm, lineHeight: BASE_FONT_SIZE * SCALE_ADJUSTMENTS.sm }]}>{t('screens.generalSettings.fontScale.descriptionSM', 'Smaller')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="md" />
            <Text onPress={() => setValue('md')} style={[styles.rowText, { flex: 1, fontSize: BASE_FONT_SIZE, lineHeight: BASE_FONT_SIZE }]}>{t('screens.generalSettings.fontScale.descriptionMD', 'Normal')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="lg" />
            <Text onPress={() => setValue('lg')} style={[styles.rowText, { flex: 1, fontSize: BASE_FONT_SIZE * SCALE_ADJUSTMENTS.lg, lineHeight: BASE_FONT_SIZE * SCALE_ADJUSTMENTS.lg }]}>{t('screens.generalSettings.fontScale.descriptionLG', 'Larger')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="xl" />
            <Text onPress={() => setValue('xl')} style={[styles.rowText, { flex: 1, fontSize: BASE_FONT_SIZE * SCALE_ADJUSTMENTS.xl, lineHeight: BASE_FONT_SIZE * SCALE_ADJUSTMENTS.xl }]}>{t('screens.generalSettings.fontScale.descriptionXL', 'Largest')}</Text>
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
