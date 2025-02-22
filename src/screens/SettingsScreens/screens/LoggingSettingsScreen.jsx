/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useMemo, useState } from 'react'
import { List, Switch } from 'react-native-paper'
import { ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { selectSettings, setSettings } from '../../../store/settings'
import { FlagsDialog } from '../components/FlagsDialog'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { findHooks } from '../../../extensions/registry'

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

export default function LoggingSettingsScreen ({ navigation }) {
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
      <ScrollView style={{ flex: 1 }}>
        <Ham2kListSection>
          {/* <Ham2kListItem title={'Clone Settings from Previous'}
            description={settings.cloneLastOperation !== false ? 'Settings for new operations are based on the most recent one' : 'New operations start with default settings' }
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="content-copy" />}
            right={() => <Switch value={settings.cloneLastOperation !== false} onValueChange={(value) => dispatch(setSettings({ cloneLastOperation: value })) } />}
            onPress={() => dispatch(setSettings({ cloneLastOperation: !settings.cloneLastOperation }))}
          /> */}

          <Ham2kListItem title={'Leftie Mode'}
            description={settings.leftieMode ? 'Use layout for left-handed users' : 'Use layout for right-handed users' }
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="hand-front-left-outline" />}
            right={() => <Switch value={!!settings.leftieMode} onValueChange={(value) => dispatch(setSettings({ leftieMode: value })) } />}
            onPress={() => dispatch(setSettings({ leftieMode: !settings.leftieMode }))}
          />

          <Ham2kListItem title={'Country Flags'}
            description={{ none: "Don't show any flags", all: 'Show flags for all contacts' }[settings.dxFlags] || 'Show only for DX contacts'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="flag" />}
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
          <Ham2kListItem title={'State Field'}
            description={settings.showStateField ? 'Include State field in main exchange' : "Don't include State field" }
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="select-marker" />}
            right={() => <Switch value={!!settings.showStateField} onValueChange={(value) => dispatch(setSettings({ showStateField: value })) } />}
            onPress={() => dispatch(setSettings({ showStateField: !settings.showStateField }))}
          />

          <Ham2kListItem title={'Show Bearing'}
            description={settings.showBearing ? 'Show estimated bearing to station' : "Don't show bearing information" }
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="compass-outline" />}
            right={() => <Switch value={!!settings.showBearing} onValueChange={(value) => dispatch(setSettings({ showBearing: value })) } />}
            onPress={() => dispatch(setSettings({ showBearing: !settings.showBearing }))}
          />

          <Ham2kListItem
            title="Switch signal report order"
            description={!settings.switchSentRcvd ? 'Sent first, Rcvd second' : 'Rcvd first, Sent second'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="arrow-left-right" />}
            right={() => <Switch value={!!settings.switchSentRcvd} onValueChange={(value) => dispatch(setSettings({ switchSentRcvd: value })) } />}
            onPress={() => dispatch(setSettings({ switchSentRcvd: !settings.switchSentRcvd }))}
          />

          <Ham2kListItem
            title="Jump to next field on RST entry"
            description={settings.jumpAfterRST ? 'Jump after RST is entered' : "Don't jump automatically" }
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="redo" />}
            right={() => <Switch value={!!settings.jumpAfterRST} onValueChange={(value) => dispatch(setSettings({ jumpAfterRST: value })) } />}
            onPress={() => dispatch(setSettings({ jumpAfterRST: !settings.jumpAfterRST }))}
          />

          <Ham2kListItem
            title="Bands & Modes"
            description={[(settings.bands || []).join(', '), (settings.modes || []).join(', ')].join(' • ')}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="radio" />}
            onPress={() => navigation.navigate('BandModeSettings')}
          />

          <Ham2kListItem
            title="Export Settings"
            description={'Customize filenames and other settings'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-export-outline" />}
            onPress={() => navigation.navigate('ExportSettings')}
          />
        </Ham2kListSection>

        {extensionSettingHooks.length > 0 && (
          <Ham2kListSection title={'Extensions'}>
            {extensionSettingHooks.map((hook) => (
              <hook.SettingItem key={hook.key} settings={settings} styles={styles} navigation={navigation} />
            ))}
          </Ham2kListSection>
        )}

      </ScrollView>
    </ScreenContainer>
  )
}

// ))}
