/* eslint-disable react/no-unstable-nested-components */
import React, { useState } from 'react'
import { List, Switch } from 'react-native-paper'
import { ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { selectSettings, setSettings } from '../../../store/settings'
import { ThemeDialog } from '../components/ThemeDialog'

export default function GeneralSettingsScreen ({ navigation }) {
  const dispatch = useDispatch()

  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      listRow: {
        marginLeft: baseStyles.oneSpace * 2,
        marginRight: baseStyles.oneSpace * 2,
        marginBottom: baseStyles.oneSpace
      }
    }
  })

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

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
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}
