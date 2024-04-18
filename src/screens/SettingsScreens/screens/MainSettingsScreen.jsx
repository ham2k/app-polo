/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { Ham2kListSubheader } from '../../components/Ham2kListSubheader'

export default function MainSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  return (
    <ScrollView style={{ flex: 1 }}>
      <Ham2kListSection>

        <Ham2kListItem
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

        <Ham2kListSubheader>Settings</Ham2kListSubheader>
        <Ham2kListItem
          title="General Settings"
          description={'Dark mode, numbers row, units, and more'}
          onPress={() => navigation.navigate('GeneralSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cogs" />}
        />

        <Ham2kListItem
          title="Logging Settings"
          description={'Customize the logging experience'}
          onPress={() => navigation.navigate('LoggingSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="book-edit-outline" />}
        />

        <Ham2kListItem
          title="Data Settings"
          description="Data files, callsign notes, and more"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-cabinet" />}
          onPress={() => navigation.navigate('DataSettings')}
        />

        <Ham2kListItem
          title="App Features"
          description={'Manage features like POTA, SOTA, etc'}
          onPress={() => navigation.navigate('FeaturesSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="format-list-bulleted" />}
        />

        {settings.devMode && (
          <Ham2kListItem
            title="Developer Settings"
            description={'Here be dragons'}
            onPress={() => navigation.navigate('DevModeSettings')}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="fire" color={styles.colors.devMode} />}
          />
        )}

      </Ham2kListSection>

      <Ham2kListSection>
        <Ham2kListSubheader>Accounts</Ham2kListSubheader>

        <Ham2kListItem
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
      </Ham2kListSection>

      <Ham2kListSection>
        <Ham2kListSubheader>About Ham2K</Ham2kListSubheader>
        <Ham2kListItem
          title="Version"
          description={packageJson.version}
          onPress={() => navigation.navigate('VersionSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="information-outline" />}
        />
        <Ham2kListItem
          title="Credits"
          description={'Sebastián Delmont KI2D & Team PoLo'}
          onPress={() => navigation.navigate('CreditsSettings')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account-group" />}
        />
      </Ham2kListSection>

      <Ham2kListSection>
        <Ham2kListSubheader>Need Help?</Ham2kListSubheader>
        <Ham2kListItem
          title="Contact Us"
          description={'Email help@ham2k.com'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="email-alert-outline" />}
          onPress={async () => await Linking.openURL('mailto:help@ham2k.com')}
        />
        <Ham2kListItem
          title="Official Reflector"
          description={'Ham2K PoLo Google Group'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="email-seal-outline" />}
          onPress={async () => await Linking.openURL('https://groups.google.com/g/ham2k-polo')}
        />
        <Ham2kListItem
          title="Discord Server"
          description={'Our online community'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="forum" />}
          onPress={async () => await Linking.openURL('https://discord.gg/c4Th9QkByJ')}
        />
      </Ham2kListSection>
    </ScrollView>
  )
}
