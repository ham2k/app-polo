/* eslint-disable react/no-unstable-nested-components */
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { List, Text } from 'react-native-paper'
import { Linking, ScrollView } from 'react-native'

import packageJson from '../../../../package.json'

import { selectSettings } from '../../../store/settings'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { OperatorCallsignDialog } from '../components/OperatorCallsignDialog'
import { AccountsQRZDialog } from '../components/AccountsQRZDialog'

export default function MainSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  return (
    <ScrollView style={{ flex: 1 }}>
      <List.Section>

        <List.Item
          title="Operator Callsign"
          description={
            settings.operatorCall ? (
              <Text style={styles.text.callsign}>{settings.operatorCall ?? 'No call'}</Text>
            ) : (
              <Text style={{ color: 'red' }}>Please enter a callsign!</Text>
            )
          }
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

        <List.Subheader>Settings</List.Subheader>
        <List.Item
          title="General Settings"
          description={'Dark mode, numbers row, units, and more'}
          onPress={() => navigation.navigate('GeneralSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cogs" />}
        />

        <List.Item
          title="Logging Settings"
          description={'Customize the logging experience'}
          onPress={() => navigation.navigate('LoggingSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="book-edit-outline" />}
        />

        <List.Item
          title="App Features"
          description={'Manage features like POTA, SOTA, etc'}
          onPress={() => navigation.navigate('FeaturesSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="format-list-bulleted" />}
        />

        {settings.devMode && (
          <List.Item
            title="Developer Settings"
            description={'Here be dragons'}
            onPress={() => navigation.navigate('DevModeSettings')}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="fire" color={styles.colors.devMode} />}
          />
        )}

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
        <List.Subheader>Tools</List.Subheader>

        <List.Item
          title="Manage data files"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-cabinet" />}
          onPress={() => navigation.navigate('DataFilesSettings')}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>About Ham2K</List.Subheader>
        <List.Item
          title="Version"
          description={packageJson.version}
          onPress={() => navigation.navigate('VersionSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="information-outline" />}
        />
        <List.Item
          title="Author"
          description={'Sebastián Delmont • KI2D'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Need Help?</List.Subheader>
        <List.Item
          title="Contact Us"
          description={'Email help@ham2k.com'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="email-alert-outline" />}
          onPress={async () => await Linking.openURL('mailto:help@ham2k.com')}
        />
        <List.Item
          title="Official Reflector"
          description={'Ham2K PoLo Google Group'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="email-seal-outline" />}
          onPress={async () => await Linking.openURL('https://groups.google.com/g/ham2k-polo')}
        />
        <List.Item
          title="Discord Server"
          description={'Our online community'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="forum" />}
          onPress={async () => await Linking.openURL('https://discord.gg/c4Th9QkByJ')}
        />
      </List.Section>
    </ScrollView>
  )
}
