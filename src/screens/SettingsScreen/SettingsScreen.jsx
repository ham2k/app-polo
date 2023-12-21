/* eslint-disable react/no-unstable-nested-components */
import React, { useState } from 'react'

import packageJson from '../../../package.json'

import { selectSettings } from '../../store/settings'
import { useSelector } from 'react-redux'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { List } from 'react-native-paper'
import { OperatorCallsignDialog } from './components/OperatorCallsignDialog'
import { ScrollView } from 'react-native'
import { AccountsQRZDialog } from './components/AccountsQRZDialog'

export default function SettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Subheader>General Settings</List.Subheader>

          <List.Item
            title="Operator's Callsign"
            description={settings.operatorCall ?? 'No call'}
            left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="card-account-details" />}
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
        </List.Section>

        <List.Section>
          <List.Subheader>Accounts</List.Subheader>

          <List.Item
            title="QRZ (for callsign lookups)"
            description={settings?.accounts?.qrz ? settings.accounts.qrz.login : 'No account'}
            left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="account" />}
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
            left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="information-outline" />}
          />
          <List.Item
            title="Author"
            description={'Sebastián Delmont • KI2D'}
            left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="information-outline" />}
          />
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}
