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
          <H2kListItem title={'Leftie Mode'}
            description={settings.leftieMode ? 'Use layout for left-handed users' : 'Use layout for right-handed users' }
            leftIcon="hand-front-left-outline"
            rightSwitchValue={!!settings.leftieMode}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ leftieMode: value }))}
            onPress={() => dispatch(setSettings({ leftieMode: !settings.leftieMode }))}
          />

          <H2kListItem title={'Country Flags'}
            description={{ none: "Don't show any flags", all: 'Show flags for all contacts' }[settings.dxFlags] || 'Show only for DX contacts'}
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
          <H2kListItem title={'State Field'}
            description={settings.showStateField ? 'Include State field in main exchange' : "Don't include State field" }
            leftIcon="select-marker"
            rightSwitchValue={!!settings.showStateField}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ showStateField: value }))}
            onPress={() => dispatch(setSettings({ showStateField: !settings.showStateField }))}
          />

          <H2kListItem title={'Show Bearing'}
            description={settings.showBearing ? 'Show estimated bearing to station' : "Don't show bearing information" }
            leftIcon="compass-outline"
            rightSwitchValue={!!settings.showBearing}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ showBearing: value }))}
            onPress={() => dispatch(setSettings({ showBearing: !settings.showBearing }))}
          />

          <H2kListItem
            title="Switch signal report order"
            description={!settings.switchSentRcvd ? 'Sent first, Rcvd second' : 'Rcvd first, Sent second'}
            leftIcon="arrow-left-right"
            rightSwitchValue={!!settings.switchSentRcvd}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ switchSentRcvd: value }))}
            onPress={() => dispatch(setSettings({ switchSentRcvd: !settings.switchSentRcvd }))}
          />

          <H2kListItem
            title="Jump to next field on RST entry"
            description={settings.jumpAfterRST ? 'Jump after RST is entered' : "Don't jump automatically" }
            leftIcon="redo"
            rightSwitchValue={!!settings.jumpAfterRST}
            rightSwitchOnValueChange={(value) => dispatch(setSettings({ jumpAfterRST: value }))}
            onPress={() => dispatch(setSettings({ jumpAfterRST: !settings.jumpAfterRST }))}
          />

          <H2kListItem
            title="Bands & Modes"
            description={[(settings.bands || []).join(', '), (settings.modes || []).join(', ')].join(' • ')}
            leftIcon="radio"
            onPress={() => navigation.navigate('BandModeSettings')}
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

// ))}
