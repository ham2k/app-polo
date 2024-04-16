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
import { ThemeDialog } from '../components/ThemeDialog'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { POTAAllParks } from '../../../extensions/activities/pota/POTAAllParksData'
import { fmtISODate } from '../../../tools/timeFormats'

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

export default function GeneralSettingsScreen ({ navigation }) {
  const dispatch = useDispatch()

  const styles = useThemedStyles(prepareStyles)

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  const [compactName, longName] = useMemo(() => {
    const call = settings.operatorCall ?? 'N0CALL'
    let info = parseCallsign(call)
    let prefix = 'X'
    if (info.baseCall) {
      info = annotateFromCountryFile(info)
    }
    if (info.dxccCode) {
      prefix = (POTAAllParks.prefixByDXCCCode && POTAAllParks.prefixByDXCCCode[info.dxccCode]) || info.entityPrefix || 'X'
    }
    return [
      `${call}@${prefix}-1234-${fmtISODate(new Date()).replace(/-/g, '')}.adi`.replace(/[/\\:]/g, '-'),
      `${fmtISODate(new Date())} ${call} at ${prefix}-1234.adi`.replace(/[/\\:]/g, '-')
    ]
  }, [settings])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Item
            title="Theme"
            description={{ dark: 'Always in Dark Mode', light: 'Always in Light Mode' }[settings.theme] || 'Same as device theme'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={{ dark: 'weather-night', light: 'white-balance-sunny' }[settings.theme] || 'theme-light-dark'} />}
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

          <List.Item
            title="Show numbers row"
            description={settings.showNumbersRow ? 'Quick buttons for numbers' : "Don't show numbers row"}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="numeric" />}
            right={() => <Switch value={!!settings.showNumbersRow} onValueChange={(value) => dispatch(setSettings({ showNumbersRow: value })) } />}
            onPress={() => dispatch(setSettings({ showNumbersRow: !settings.showNumbersRow }))}
          />

          <List.Item
            title="Use Metric Units"
            description={settings.distanceUnits === 'miles' ? 'Use Miles for distances' : 'Use Kilometers for distances'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="tape-measure" />}
            right={() => <Switch value={settings.distanceUnits !== 'miles'} onValueChange={(value) => dispatch(setSettings({ distanceUnits: settings.distanceUnits === 'miles' ? 'km' : 'miles' })) } />}
            onPress={() => dispatch(setSettings({ distanceUnits: settings.distanceUnits === 'miles' ? 'km' : 'miles' }))}
          />

          <List.Item
            title="Keep device awake"
            description={settings.keepDeviceAwake ? 'Prevent device from locking screen' : 'Allow regular screen locking'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="coffee" />}
            right={() => <Switch value={!!settings.keepDeviceAwake} onValueChange={(value) => dispatch(setSettings({ keepDeviceAwake: value })) } />}
            onPress={() => dispatch(setSettings({ keepDeviceAwake: !settings.keepDeviceAwake }))}
          />

          <List.Item
            title="Use compact file names"
            description={settings.useCompactFileNames ? compactName : longName}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-code-outline" />}
            right={() => <Switch value={!!settings.useCompactFileNames} onValueChange={(value) => dispatch(setSettings({ useCompactFileNames: value })) } />}
            onPress={() => dispatch(setSettings({ useCompactFileNames: !settings.useCompactFileNames }))}
          />

          <List.Subheader>Privacy</List.Subheader>
          <List.Item
            title="Share app usage data"
            description={settings.consentAppData ? 'Help us improve the app by sharing usage, crash and performance data' : 'Keep app usage data private'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone-lock" />}
            right={() => <Switch value={!!settings.consentAppData} onValueChange={(value) => dispatch(setSettings({ consentAppData: value })) } />}
            onPress={() => dispatch(setSettings({ consentAppData: !settings.consentAppData }))}
          />

          <List.Item
            title="Share operation data"
            description={settings.consentOpData ? 'Share some operation data publicly and with other users' : 'Keep operation data private'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone-lock" />}
            right={() => <Switch value={!!settings.consentOpData} onValueChange={(value) => dispatch(setSettings({ consentOpData: value })) } />}
            onPress={() => dispatch(setSettings({ consentAppData: !settings.consentOpData }))}
          />
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}
