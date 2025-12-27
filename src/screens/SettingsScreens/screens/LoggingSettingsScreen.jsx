/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings, setSettings } from '../../../store/settings'
import { FlagsDialog } from '../components/FlagsDialog'
import { findHooks } from '../../../extensions/registry'
import { H2kListItem, H2kListSection } from '../../../ui'

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

export default function LoggingSettingsScreen ({ navigation, splitView }) {
  const { t } = useTranslation()

  const safeAreaInsets = useSafeAreaInsets()
  const dispatch = useDispatch()

  const styles = useThemedStyles(prepareStyles)

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  const extensionSettingHooks = useMemo(() => {
    const hooks = findHooks('setting').filter(hook => hook.category === 'logging' && hook.SettingItem)
    return hooks
  }, [])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem title={t('screens.loggingSettings.leftieMode.title', 'Leftie Mode')}
            description={settings.leftieMode ? t('screens.loggingSettings.leftieMode.descriptionOn', 'Use layout for left-handed users') : t('screens.loggingSettings.leftieMode.descriptionOff', 'Use layout for right-handed users') }
            leftIcon="hand-front-left-outline"
            rightSwitchValue={!!settings.leftieMode}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ leftieMode: value }))}
            onPress={() => dispatch(setSettings({ leftieMode: !settings.leftieMode }))}
          />

          <H2kListItem title={t('screens.loggingSettings.countryFlags.title', 'Country Flags')}
            description={{ none: t('screens.loggingSettings.countryFlags.descriptionNone', "Don't show any flags"), all: t('screens.loggingSettings.countryFlags.descriptionAll', 'Show flags for all contacts') }[settings.dxFlags] || t('screens.loggingSettings.countryFlags.descriptionDefault', 'Show only for DX contacts')}
            leftIcon="flag"
            onPress={() => setCurrentDialog('flags')}
          />
          {currentDialog === 'flags' && (
            <FlagsDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}

          <H2kListItem title={t('screens.loggingSettings.showBearing.title', 'Show Bearing')}
            description={settings.showBearing ? t('screens.loggingSettings.showBearing.descriptionOn', 'Show estimated bearing to station') : t('screens.loggingSettings.showBearing.descriptionOff', "Don't show bearing information") }
            leftIcon="compass-outline"
            rightSwitchValue={!!settings.showBearing}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ showBearing: value }))}
            onPress={() => dispatch(setSettings({ showBearing: !settings.showBearing }))}
          />

          <H2kListItem
            title={t('screens.loggingSettings.switchSignalReportOrder.title', 'Switch signal report order')}
            description={!settings.switchSentRcvd ? t('screens.loggingSettings.switchSignalReportOrder.descriptionOn', 'Sent first, Rcvd second') : t('screens.loggingSettings.switchSignalReportOrder.descriptionOff', 'Rcvd first, Sent second')}
            leftIcon="arrow-left-right"
            rightSwitchValue={!!settings.switchSentRcvd}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ switchSentRcvd: value }))}
            onPress={() => dispatch(setSettings({ switchSentRcvd: !settings.switchSentRcvd }))}
          />

          <H2kListItem
            title={t('screens.loggingSettings.jumpAfterRST.title', 'Jump to next field on RST entry')}
            description={settings.jumpAfterRST ? t('screens.loggingSettings.jumpAfterRST.descriptionOn', 'Jump after RST is entered') : t('screens.loggingSettings.jumpAfterRST.descriptionOff', "Don't jump automatically") }
            leftIcon="redo"
            rightSwitchValue={!!settings.jumpAfterRST}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ jumpAfterRST: value }))}
            onPress={() => dispatch(setSettings({ jumpAfterRST: !settings.jumpAfterRST }))}
          />

          <H2kListItem
            title={t('screens.loggingSettings.suggestDefaultOperator.title', 'Suggest default operator')}
            description={settings.suggestDefaultOperator ? t('screens.loggingSettings.suggestDefaultOperator.descriptionOn', `Set ${settings?.operatorCall} as operator in operations where station call is different`) : t('screens.loggingSettings.suggestDefaultOperator.descriptionOff', "Don't suggest default operator regardless of station call used") }
            leftIcon="account-question"
            rightSwitchValue={settings.suggestDefaultOperator !== false}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ suggestDefaultOperator: value }))}
            onPress={() => dispatch(setSettings({ suggestDefaultOperator: !settings.suggestDefaultOperator }))}
          />

          <H2kListItem
            title={t('screens.loggingSettings.suggestTemplates.title', 'Suggest operation templates')}
            description={settings.suggestTemplates !== false ? t('screens.loggingSettings.suggestTemplates.descriptionOn', 'Suggest templates for new operations') : t('screens.loggingSettings.suggestTemplates.descriptionOff', "Don't suggest templates")}
            leftIcon="progress-question"
            rightSwitchValue={settings.suggestTemplates !== false}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ suggestTemplates: value }))}
            onPress={() => dispatch(setSettings({ suggestTemplates: !settings.suggestTemplates }))}
          />

          <H2kListItem
            title={t('screens.loggingSettings.bandsModes.title', 'Bands & Modes')}
            description={t('screens.loggingSettings.bandsModes.description', '{{bands}} • {{modes}}', { bands: (settings.bands || []).join(', '), modes: (settings.modes || []).join(', ') })}
            leftIcon="radio"
            onPress={() => navigation.navigate('BandModeSettings')}
          />
        </H2kListSection>

        {extensionSettingHooks.length > 0 && (
          <H2kListSection title={t('screens.loggingSettings.extensions.title', 'Extensions')}>
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

// ))}
