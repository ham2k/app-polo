// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useState } from 'react'
import { Switch, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { View } from 'react-native'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

/*
 * The answer is written on Next only. Back (or Not now, when StartScreen asks this on its
 * own) leaves the `ham2k-lofi` flag as it was: an unset flag is what tells an install that
 * never chose apart from one that did (see cloudSyncPrompt.js).
 */
export function SyncAccountDialog ({ inputMode, settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const lofiDataSelector = useCallback((state) => selectLocalExtensionData(state, 'ham2k-lofi'), [])
  const lofiData = useSelector(lofiDataSelector)

  // Unset starts on, as it always has for a new install.
  const [enabled, setEnabled] = useState(lofiData?.enabled ?? true)

  const handleNext = useCallback(async () => {
    dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled }))
    onDialogNext && onDialogNext()
  }, [dispatch, enabled, onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <H2kDialog visible={true} dismissable={false}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.startScreen.onboarding.cloudSync', 'Cloud Sync')}</H2kDialogTitle>
      <H2kDialogContent>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center', marginBottom: styles.oneSpace * 2 }}>
          {t('screens.startScreen.onboarding.cloudSyncDescription', 'Ham2K Log Filer keeps a backup of your logs in the cloud, and syncs them across all the devices where you use Ham2K apps.')}
        </Text>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center', marginBottom: styles.oneSpace * 2 }}>
          {t('screens.startScreen.onboarding.cloudSyncPricing', 'It\'s free! But a paid subscription will make it faster.')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          <Switch value={enabled} onValueChange={(v) => {
            // Workaround for Switch component not updating immediately inside Portal.
            // See https://github.com/callstack/react-native-paper/issues/4789
            setTimeout(() => setEnabled(v), 10)
          }}
          />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => setEnabled(!enabled)}>
            {t('screens.startScreen.onboarding.enableCloudSync', 'Enable Cloud Sync')}
          </Text>
        </View>
        {!enabled && (
          <Text style={{ fontSize: styles.normalFontSize, fontWeight: 'bold', color: styles.theme.colors.error, textAlign: 'center', marginTop: styles.oneSpace }}>
            {t('screens.startScreen.onboarding.cloudSyncOffWarning', 'WARNING: this increases your chances of losing operation data, for example if your device crashes or is lost.')}
          </Text>
        )}
      </H2kDialogContent>
      <H2kDialogActions style={{ justifyContent: 'space-between' }}>
        <H2kButton onPress={handlePrevious}>{previousLabel ?? t('general.buttons.back', 'Back')}</H2kButton>
        <H2kButton onPress={handleNext}>{nextLabel ?? t('general.buttons.continue', 'Continue')}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
