/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useState } from 'react'
import { Platform, ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings, setSettings } from '../../../store/settings'
import { ThemeDialog } from '../components/ThemeDialog'
import ScreenContainer from '../../components/ScreenContainer'
import { findHooks } from '../../../extensions/registry'
import { H2kListItem, H2kListSection, H2kListSubheader } from '../../../ui'
import { FontScaleDialog } from '../components/FontScaleDialog'
import { LanguageDialog } from '../components/LanguageDialog'

function prepareStyles(baseStyles) {
  return {
    ...baseStyles,
    listRow: {
      marginLeft: baseStyles.oneSpace * 2,
      marginRight: baseStyles.oneSpace * 2,
      marginBottom: baseStyles.oneSpace
    }
  }
}

export default function GeneralSettingsScreen({ navigation, splitView }) {
  const { t, i18n } = useTranslation()

  const dispatch = useDispatch()

  const styles = useThemedStyles(prepareStyles)
  const safeAreaInsets = useSafeAreaInsets()

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  const extensionSettingHooks = useMemo(() => {
    const hooks = findHooks('setting').filter(hook => hook.category === 'general' && hook.SettingItem)
    return hooks
  }, [])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem
            title={t('screens.generalSettings.theme.title', 'Theme')}
            description={{
              dark: t('screens.generalSettings.theme.descriptionDark', 'Always in Dark Mode'),
              light: t('screens.generalSettings.theme.descriptionLight', 'Always in Light Mode')
            }[settings.theme] || t('screens.generalSettings.theme.descriptionDevice', 'Same as device theme')}
            leftIcon={{ dark: 'weather-night', light: 'white-balance-sunny' }[settings.theme] || 'theme-light-dark'}
            onPress={() => setCurrentDialog('theme')}
          />
          {currentDialog === 'theme' && (
            <ThemeDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}

          <H2kListItem
            title={t('screens.generalSettings.fontScale.title', 'Font Scale')}
            description={{
              xs: t('screens.generalSettings.fontScale.descriptionXS', 'Smallest'),
              sm: t('screens.generalSettings.fontScale.descriptionSM', 'Smaller'),
              md: t('screens.generalSettings.fontScale.descriptionMD', 'Normal'),
              lg: t('screens.generalSettings.fontScale.descriptionLG', 'Larger'),
              xl: t('screens.generalSettings.fontScale.descriptionXL', 'Largest')
            }[settings.fontScale || 'md']}
            leftIcon={'format-size'}
            onPress={() => setCurrentDialog('fontScale')}
          />
          {currentDialog === 'fontScale' && (
            <FontScaleDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}

          <H2kListItem
            title={
              t('screens.generalSettings.language.title', 'Language: {{lang}}', {
                lang: t(`general.languages.names.${i18n.language}`, `[${i18n.language}]`),
                langCode: i18n.language
              })
            }
            description={t('screens.generalSettings.language.description', 'Change the language of the app')}
            leftIcon="web"
            onPress={() => setCurrentDialog('language')}
          />
          {currentDialog === 'language' && (
            <LanguageDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}

          <H2kListItem
            title={t('screens.generalSettings.showNumbersRow.title', 'Show numbers row')}
            description={settings.showNumbersRow ? t('screens.generalSettings.showNumbersRow.descriptionOn', 'Quick buttons for numbers') : t('screens.generalSettings.showNumbersRow.descriptionOff', "Don't show numbers row")}
            leftIcon="numeric"
            rightSwitchValue={!!settings.showNumbersRow}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ showNumbersRow: value }))}
            onPress={() => dispatch(setSettings({ showNumbersRow: !settings.showNumbersRow }))}
          />

          {settings.showNumbersRow && (
            <H2kListItem
              style={{ marginLeft: styles.oneSpace * 8 }}
              title={t('screens.generalSettings.showExtraInNumbersRow.title', 'Period in numbers row')}
              description={settings.showExtraInNumbersRow ? t('screens.generalSettings.showExtraInNumbersRow.descriptionOn', 'Include period (and slash)') : t('screens.generalSettings.showExtraInNumbersRow.descriptionOff', 'Just show the numbers')}
              disabled={!settings.showNumbersRow}
              rightSwitchValue={!!settings.showExtraInNumbersRow}
              rightSwitchOnValueChange={(value) => dispatch(setSettings({ showExtraInNumbersRow: value }))}
              onPress={() => dispatch(setSettings({ showNumbersRow: !settings.showExtraInNumbersRow }))}
            />
          )}

          {settings.showNumbersRow && (
            <H2kListItem
              style={{ marginLeft: styles.oneSpace * 8 }}
              title={t('screens.generalSettings.showCommaInNumbersRow.title', 'Comma in numbers row')}
              description={settings.showCommaInNumbersRow ? t('screens.generalSettings.showCommaInNumbersRow.descriptionOn', 'Include a comma key') : t('screens.generalSettings.showCommaInNumbersRow.descriptionOff', 'No comma key')}
              disabled={!settings.showNumbersRow}
              rightSwitchValue={!!settings.showCommaInNumbersRow}
              rightSwitchOnValueChange={(value) => dispatch(setSettings({ showCommaInNumbersRow: value }))}
              onPress={() => dispatch(setSettings({ showNumbersRow: !settings.showCommaInNumbersRow }))}
            />
          )}

          {settings.showNumbersRow && (
            <H2kListItem
              style={{ marginLeft: styles.oneSpace * 8 }}
              title={t('screens.generalSettings.vibrateNumbersRow.title', 'Use vibration in numbers row')}
              description={settings.vibrateNumbersRow !== false ? t('screens.generalSettings.vibrateNumbersRow.descriptionOn', 'Vibrate when pressing numbers') : t('screens.generalSettings.vibrateNumbersRow.descriptionOff', "Don't vibrate when pressing numbers")}
              disabled={!settings.showNumbersRow}
              rightSwitchValue={!!settings.vibrateNumbersRow}
              rightSwitchOnValueChange={(value) => dispatch(setSettings({ vibrateNumbersRow: value }))}
              onPress={() => dispatch(setSettings({ showNumbersRow: !settings.vibrateNumbersRow }))}
            />
          )}

          <H2kListItem
            title={t('screens.generalSettings.useMetricUnits.title', 'Use Metric Units')}
            description={settings.distanceUnits === 'miles' ? t('screens.generalSettings.useMetricUnits.descriptionOn', 'Use Miles for distances') : t('screens.generalSettings.useMetricUnits.descriptionOff', 'Use Kilometers for distances')}
            leftIcon="tape-measure"
            rightSwitchValue={settings.distanceUnits !== 'miles'}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ distanceUnits: settings.distanceUnits === 'miles' ? 'km' : 'miles' }))}
            onPress={() => dispatch(setSettings({ distanceUnits: settings.distanceUnits === 'miles' ? 'km' : 'miles' }))}
          />

          <H2kListItem
            title={t('screens.generalSettings.keepDeviceAwake.title', 'Keep device awake')}
            description={settings.keepDeviceAwake ? t('screens.generalSettings.keepDeviceAwake.descriptionOn', 'Prevent device from locking screen') : t('screens.generalSettings.keepDeviceAwake.descriptionOff', 'Allow regular screen locking')}
            leftIcon="coffee"
            rightSwitchValue={!!settings.keepDeviceAwake}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ keepDeviceAwake: value }))}
            onPress={() => dispatch(setSettings({ keepDeviceAwake: !settings.keepDeviceAwake }))}
          />

          {styles.mdOrLarger && (
            <H2kListItem
              title={t('screens.generalSettings.useSplitViews.title', 'Use Split Views')}
              description={settings.dontSplitViews ? t('screens.generalSettings.useSplitViews.descriptionOff', "Don't use split views") : t('screens.generalSettings.useSplitViews.descriptionOn', 'Use Split Views when screen is large enough')}
              leftIcon="arrow-split-vertical"
              rightSwitchValue={!settings.dontSplitViews}
              rightSwitchOnValueChange={(value) => dispatch(setSettings({ dontSplitViews: !value }))}
              onPress={() => dispatch(setSettings({ dontSplitViews: !settings.dontSplitViews }))}
            />
          )}

          <H2kListItem
            title={t('screens.generalSettings.useGrid8.title', 'High precision location')}
            description={settings.useGrid8 ? t('screens.generalSettings.useGrid8.descriptionOn', 'Use 8-digit grids') : t('screens.generalSettings.useGrid8.descriptionOff', 'Use 6-digit grids')}
            leftIcon="select-marker"
            rightSwitchValue={!!settings.useGrid8}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ useGrid8: value }))}
            onPress={() => dispatch(setSettings({ useGrid8: !settings.useGrid8 }))}
          />

          {Platform.OS === 'android' && (
            <H2kListItem
              title={t('screens.generalSettings.smartKeyboard.title', 'Smart Keyboard Features')}
              description={settings.smartKeyboard !== false ? t('screens.generalSettings.smartKeyboard.descriptionOn', 'Enable smart keyboard features') : t('screens.generalSettings.smartKeyboard.descriptionOff', 'Use simpler keyboards for compatibility reasons with some devices')}
              leftIcon="keyboard-outline"
              rightSwitchValue={!!settings.smartKeyboard}
              rightSwitchOnValueChange={(value) => dispatch(setSettings({ smartKeyboard: value }))}
              onPress={() => dispatch(setSettings({ smartKeyboard: !settings.smartKeyboard }))}
            />
          )}

          <H2kListItem
            title={t('screens.generalSettings.exportSettings.title', 'Export Settings')}
            description={t('screens.generalSettings.exportSettings.description', 'Customize filenames and other settings')}
            leftIcon="file-export-outline"
            onPress={() => navigation.navigate('ExportSettings')}
          />

          <H2kListSubheader>{t('screens.generalSettings.privacy.title', 'Privacy')}</H2kListSubheader>
          <H2kListItem
            title={t('screens.generalSettings.shareAppUsageData.title', 'Share app usage data')}
            description={settings.consentAppData ? t('screens.generalSettings.shareAppUsageData.descriptionOn', 'Help us improve the app by sharing usage, crash and performance data') : t('screens.generalSettings.shareAppUsageData.descriptionOff', 'Keep app usage data private.\nThe Ham2K team won\'t be able to detect crashes or other issues.')}
            leftIcon="cellphone-lock"
            rightSwitchValue={!!settings.consentAppData}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ consentAppData: value }))}
            onPress={() => dispatch(setSettings({ consentAppData: !settings.consentAppData }))}
          />

          <H2kListItem
            title={t('screens.generalSettings.shareOperationData.title', 'Share operation data')}
            description={settings.consentOpData ? t('screens.generalSettings.shareOperationData.descriptionOn', 'Share some operation data publicly and with other users') : t('screens.generalSettings.shareOperationData.descriptionOff', 'Keep operation data private')}
            leftIcon="cellphone-lock"
            rightSwitchValue={!!settings.consentOpData}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ consentOpData: value }))}
            onPress={() => dispatch(setSettings({ consentAppData: !settings.consentOpData }))}
          />
        </H2kListSection>

        {extensionSettingHooks.length > 0 && (
          <H2kListSection title={t('screens.generalSettings.extensions.title', 'Extensions')}>
            {extensionSettingHooks.map((hook) => (
              <hook.SettingItem key={hook.key} settings={settings} styles={styles} navigation={navigation} />
            ))}
          </H2kListSection>
        )}

        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>
    </ScreenContainer>
  )
}
