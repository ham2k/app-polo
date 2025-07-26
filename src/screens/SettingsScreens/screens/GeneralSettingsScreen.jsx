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

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings, setSettings } from '../../../store/settings'
import { ThemeDialog } from '../components/ThemeDialog'
import ScreenContainer from '../../components/ScreenContainer'
import { findHooks } from '../../../extensions/registry'
import { H2kListItem, H2kListSection, H2kListSubheader } from '../../../ui'

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    listRow: {
      marginLeft: baseStyles.oneSpace * 2,
      marginRight: baseStyles.oneSpace * 2,
      marginBottom: baseStyles.oneSpace
    }
  }
}

export default function GeneralSettingsScreen ({ navigation, splitView }) {
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
            title="Theme"
            description={{ dark: 'Always in Dark Mode', light: 'Always in Light Mode' }[settings.theme] || 'Same as device theme'}
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
            title="Show numbers row"
            description={settings.showNumbersRow ? 'Quick buttons for numbers' : "Don't show numbers row"}
            leftIcon="numeric"
            rightSwitchValue={!!settings.showNumbersRow}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ showNumbersRow: value }))}
            onPress={() => dispatch(setSettings({ showNumbersRow: !settings.showNumbersRow }))}
          />

          {settings.showNumbersRow && (
            <H2kListItem
              style={{ marginLeft: styles.oneSpace * 8 }}
              title="Extra key in numbers row"
              description={settings.showExtraInNumbersRow ? 'Include slash or period' : 'Just show the numbers'}
              disabled={!settings.showNumbersRow}
              rightSwitchValue={!!settings.showExtraInNumbersRow}
              rightSwitchOnValueChange={(value) => dispatch(setSettings({ showExtraInNumbersRow: value }))}
              onPress={() => dispatch(setSettings({ showNumbersRow: !settings.showExtraInNumbersRow }))}
            />
          )}

          {settings.showNumbersRow && (
            <H2kListItem
              style={{ marginLeft: styles.oneSpace * 8 }}
              title="Use vibration in numbers row"
              description={settings.vibrateNumbersRow !== false ? 'Vibrate when pressing numbers' : "Don't vibrate when pressing numbers"}
              disabled={!settings.showNumbersRow}
              rightSwitchValue={!!settings.vibrateNumbersRow}
              rightSwitchOnValueChange={(value) => dispatch(setSettings({ vibrateNumbersRow: value }))}
              onPress={() => dispatch(setSettings({ showNumbersRow: !settings.vibrateNumbersRow }))}
            />
          )}

          <H2kListItem
            title="Use Metric Units"
            description={settings.distanceUnits === 'miles' ? 'Use Miles for distances' : 'Use Kilometers for distances'}
            leftIcon="tape-measure"
            rightSwitchValue={settings.distanceUnits !== 'miles'}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ distanceUnits: settings.distanceUnits === 'miles' ? 'km' : 'miles' }))}
            onPress={() => dispatch(setSettings({ distanceUnits: settings.distanceUnits === 'miles' ? 'km' : 'miles' }))}
          />

          <H2kListItem
            title="Keep device awake"
            description={settings.keepDeviceAwake ? 'Prevent device from locking screen' : 'Allow regular screen locking'}
            leftIcon="coffee"
            rightSwitchValue={!!settings.keepDeviceAwake}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ keepDeviceAwake: value }))}
            onPress={() => dispatch(setSettings({ keepDeviceAwake: !settings.keepDeviceAwake }))}
          />

          {styles.mdOrLarger && (
            <H2kListItem
              title="Use Split Views"
              description={settings.dontSplitViews ? "Don't use split views" : 'Use Split Views when screen is large enough' }
              leftIcon="arrow-split-vertical"
              rightSwitchValue={!settings.dontSplitViews}
              rightSwitchOnValueChange={(value) => dispatch(setSettings({ dontSplitViews: !value }))}
              onPress={() => dispatch(setSettings({ dontSplitViews: !settings.dontSplitViews }))}
            />
          )}

          <H2kListItem
            title="High precision location"
            description={settings.useGrid8 ? 'Use 8-digit grids' : 'Use 6-digit grids'}
            leftIcon="select-marker"
            rightSwitchValue={!!settings.useGrid8}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ useGrid8: value }))}
            onPress={() => dispatch(setSettings({ useGrid8: !settings.useGrid8 }))}
          />

          {Platform.OS === 'android' && (
            <H2kListItem
              title="Smart Keyboard Features"
              description={settings.smartKeyboard !== false ? 'Enable smart keyboard features' : 'Use simpler keyboards for compatibility reasons with some devices'}
              leftIcon="keyboard-outline"
              rightSwitchValue={!!settings.smartKeyboard}
              rightSwitchOnValueChange={(value) => dispatch(setSettings({ smartKeyboard: value }))}
              onPress={() => dispatch(setSettings({ smartKeyboard: !settings.smartKeyboard }))}
            />
          )}

          <H2kListItem
            title="Export Settings"
            description={'Customize filenames and other settings'}
            leftIcon="file-export-outline"
            onPress={() => navigation.navigate('ExportSettings')}
          />

          <H2kListSubheader>Privacy</H2kListSubheader>
          <H2kListItem
            title="Share app usage data"
            description={settings.consentAppData ? 'Help us improve the app by sharing usage, crash and performance data' : 'Keep app usage data private.\nThe Ham2K team won\'t be able to detect crashes or other issues.'}
            leftIcon="cellphone-lock"
            rightSwitchValue={!!settings.consentAppData}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ consentAppData: value }))}
            onPress={() => dispatch(setSettings({ consentAppData: !settings.consentAppData }))}
          />

          <H2kListItem
            title="Share operation data"
            description={settings.consentOpData ? 'Share some operation data publicly and with other users' : 'Keep operation data private'}
            leftIcon="cellphone-lock"
            rightSwitchValue={!!settings.consentOpData}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ consentOpData: value }))}
            onPress={() => dispatch(setSettings({ consentAppData: !settings.consentOpData }))}
          />
        </H2kListSection>

        {extensionSettingHooks.length > 0 && (
          <H2kListSection title={'Extensions'}>
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
