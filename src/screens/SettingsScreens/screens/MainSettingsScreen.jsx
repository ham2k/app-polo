import React, { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List, Switch, Text } from 'react-native-paper'
import { ScrollView } from 'react-native'
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

  const OperatorCallsignIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="card-account-details" />
  ), [styles])

  const ThemeIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={{ dark: 'weather-night', light: 'white-balance-sunny' }[settings.theme] || 'theme-light-dark'} />
  ), [styles, settings?.theme])

  const NumbersRowIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="numeric" />
  ), [styles])

  const QRZAccountIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="web" />
  ), [styles])

  const ManageDataFilesIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-cabinet" />
  ), [styles])

  const ImportOperationFilesIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-download" />
  ), [styles])

  const VersionIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="information-outline" />
  ), [styles])

  const AuthorIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />
  ), [styles])

  const ToggleNumbersRow = useCallback(() => (
    <Switch value={!!settings.showNumbersRow} onValueChange={(value) => dispatch(setSettings({ showNumbersRow: value })) } />
  ), [dispatch, settings.showNumbersRow])

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
          left={OperatorCallsignIcon}
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
          left={ThemeIcon}
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
          description={''}
          left={NumbersRowIcon}
          right={ToggleNumbersRow}
          onPress={() => dispatch(setSettings({ showNumbersRow: !settings.showNumbersRow }))}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Accounts</List.Subheader>

        <List.Item
          title="QRZ (for callsign lookups)"
          description={settings?.accounts?.qrz ? `Login: ${settings.accounts.qrz.login}` : 'No account'}
          left={QRZAccountIcon}
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
          left={ManageDataFilesIcon}
          onPress={() => navigation.navigate('DataFilesSettings')}
        />
        <List.Item
          title="Import operation files"
          left={ImportOperationFilesIcon}
          onPress={handleImportFiles}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>About Ham2K</List.Subheader>
        <List.Item
          title="Version"
          description={packageJson.version}
          onPress={() => navigation.navigate('VersionSettings')}
          left={VersionIcon}
        />
        <List.Item
          title="Author"
          description={'Sebastián Delmont • KI2D'}
          left={AuthorIcon}
        />
      </List.Section>
    </ScrollView>
  )
}
