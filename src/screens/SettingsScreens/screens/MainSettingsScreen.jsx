/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List, Switch, Text } from 'react-native-paper'
import { Linking, ScrollView } from 'react-native'
import DocumentPicker from 'react-native-document-picker'

import packageJson from '../../../../package.json'

import { selectSettings, setSettings } from '../../../store/settings'
import { importQSON } from '../../../store/operations'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { OperatorCallsignDialog } from '../components/OperatorCallsignDialog'
import { AccountsQRZDialog } from '../components/AccountsQRZDialog'
import { ThemeDialog } from '../components/ThemeDialog'

export default function MainSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()
  const dispatch = useDispatch()

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  const handleImportFiles = useCallback(() => {
    DocumentPicker.pickSingle().then((file) => {
      console.info('File', file)
      dispatch(importQSON(file.uri))
    })
  }, [dispatch])

  return (
    <ScrollView style={{ flex: 1 }}>
      <List.Section>
        <List.Subheader>General Settings</List.Subheader>

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
          title="Use Metric Units"
          description={settings.distanceUnits === 'miles' ? 'Use Miles for distances' : 'Use Kilometers for distances'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="tape-measure" />}
          right={() => <Switch value={settings.distanceUnits !== 'miles'} onValueChange={(value) => dispatch(setSettings({ distanceUnits: settings.distanceUnits === 'miles' ? 'km' : 'miles' })) } />}
          onPress={() => dispatch(setSettings({ distanceUnits: settings.distanceUnits === 'miles' ? 'km' : 'miles' }))}
        />

        <List.Item
          title="Logging Settings"
          description={''}
          onPress={() => navigation.navigate('LoggingSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="book-edit-outline" />}
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
        <List.Subheader>Tools</List.Subheader>

        <List.Item
          title="Manage data files"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-cabinet" />}
          onPress={() => navigation.navigate('DataFilesSettings')}
        />
        <List.Item
          title="Import operation files"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-download" />}
          onPress={handleImportFiles}
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
