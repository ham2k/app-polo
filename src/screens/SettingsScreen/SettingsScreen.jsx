/* eslint-disable react/no-unstable-nested-components */
import React, { useState } from 'react'

import packageJson from '../../../package.json'

import { selectSettings, setSettings } from '../../store/settings'
import { useDispatch, useSelector } from 'react-redux'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { List, Switch } from 'react-native-paper'
import { OperatorCallsignDialog } from './components/OperatorCallsignDialog'
import { ScrollView } from 'react-native'
import { AccountsQRZDialog } from './components/AccountsQRZDialog'

export default function SettingsScreen ({ navigation }) {
  const styles = useThemedStyles()
  const dispatch = useDispatch()

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Subheader>General Settings</List.Subheader>

          <List.Item
            title="Operator Callsign"
            description={settings.operatorCall ?? 'No call'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="card-account-details" />}
            onPress={() => setCurrentDialog('operatorCall')}
          />
          {currentDialog === 'operatorCall' && (
            <OperatorCallsignDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}

          <List.Item
            title="Show numbers row"
            description={''}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="numeric" />}
            right={() => <Switch value={!!settings.showNumbersRow} onValueChange={(value) => dispatch(setSettings({ showNumbersRow: value })) } />}
            onPress={() => dispatch(setSettings({ showNumbersRow: !settings.showNumbersRow }))}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Accounts</List.Subheader>

          <List.Item
            title="QRZ (for callsign lookups)"
            description={settings?.accounts?.qrz ? `Login: ${settings.accounts.qrz.login}` : 'No account'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="web" />}
            onPress={() => setCurrentDialog('accountsQRZ')}
          />
          {currentDialog === 'accountsQRZ' && (
            <AccountsQRZDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}
        </List.Section>

        <List.Section>
          <List.Subheader>About Ham2K</List.Subheader>
          <List.Item
            title="Version"
            description={packageJson.version}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="information-outline" />}
          />
          <List.Item
            title="Author"
            description={'Sebastián Delmont • KI2D'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
          />
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}
