/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { List, Text } from 'react-native-paper'
import { Linking, ScrollView, useWindowDimensions, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import packageJson from '../../../../package.json'

import { selectSettings } from '../../../store/settings'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { Ham2kListSubheader } from '../../components/Ham2kListSubheader'
import ScreenContainer from '../../components/ScreenContainer'
import HeaderBar from '../../components/HeaderBar'

import { OperatorCallsignDialog } from '../components/OperatorCallsignDialog'
import { AccountsQRZDialog } from '../components/AccountsQRZDialog'

import BandModeSettingsScreen from './BandModeSettingsScreen'
import CreditsSettingsScreen from './CreditsSettingsScreen'
import DataSettingsScreen from './DataSettingsScreen'
import DevModeSettingsScreen from './DevModeSettingsScreen'
import ExtensionScreen from './ExtensionScreen'
import FeaturesSettingsScreen from './FeaturesSettingsScreen'
import GeneralSettingsScreen from './GeneralSettingsScreen'
import LoggingSettingsScreen from './LoggingSettingsScreen'
import VersionSettingsScreen from './VersionSettingsScreen'

const Stack = createNativeStackNavigator()

export default function MainSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const headerOptions = useMemo(() => {
    let options = {}
    options = { title: 'Settings' }
    options.closeInsteadOfBack = true
    return options
  }, [])

  const dimensions = useWindowDimensions()

  const splitView = useMemo(() => {
    return !settings.dontSplitViews && (dimensions.width / styles.oneSpace > 95)
  }, [dimensions?.width, styles?.oneSpace, settings?.dontSplitViews])

  const [splitWidth] = useState(splitView ? Math.max(dimensions.width * 0.40, styles.oneSpace * 40) : dimensions.width)

  if (splitView) {
    return (
      <>
        <ScreenContainer>
          <View style={{ height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
            <View
              style={{
                width: splitWidth,
                height: '100%',
                borderColor: styles.colors.primary,
                borderRightWidth: styles.oneSpace
              }}
            >
              <HeaderBar options={headerOptions} navigation={navigation} back={true} />
              <MainSettingsOptions settings={settings} styles={styles} navigation={navigation} />
            </View>
            <View
              style={{
                backgroundColor: styles.colors.primary,
                flex: 1,
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'stretch'
              }}
            >
              <Stack.Navigator
                id="SettingsNavigator"
                initialRouteName={'GeneralSettings'}
                screenOptions={{
                  header: HeaderBar,
                  animation: 'slide_from_right'
                }}
              >
                {settingsScreensArray({ includeMain: false, topLevelBack: false })}
              </Stack.Navigator>
            </View>
          </View>
        </ScreenContainer>
      </>
    )
  } else {
    return (
      <ScreenContainer>
        <Stack.Navigator
          id="SettingsNavigator"
          initialRouteName={'MainSettings'}
          screenOptions={{
            header: HeaderBar,
            animation: 'slide_from_right'
          }}
        >
          {settingsScreensArray({ includeMain: true, topLevelBack: true })}
        </Stack.Navigator>
      </ScreenContainer>
    )
  }
}

function MainSettingsOptions ({ settings, styles, navigation }) {
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

function MainSettingsOptionsScreen ({ navigation }) {
  const styles = useThemedStyles()
  const settings = useSelector(selectSettings)

  return (
    <MainSettingsOptions
      navigation={navigation}
      settings={settings}
      styles={styles}
    />
  )
}

function settingsScreensArray ({ includeMain, topLevelBack }) {
  const screens = [
    <Stack.Screen name="GeneralSettings" key="GeneralSettings"
      options={{ title: 'General Settings', headerBackVisible: topLevelBack }}
      component={GeneralSettingsScreen}
    />,

    <Stack.Screen name="LoggingSettings" key="LoggingSettings"
      options={{ title: 'Logging Settings', headerBackVisible: topLevelBack }}
      component={LoggingSettingsScreen}
    />,

    <Stack.Screen name="FeaturesSettings" key="FeaturesSettings"
      options={{ title: 'App Features', headerBackVisible: topLevelBack }}
      component={FeaturesSettingsScreen}
    />,

    <Stack.Screen name="DataSettings" key="DataSettings"
      options={{ title: 'Data Settings', headerBackVisible: topLevelBack }}
      component={DataSettingsScreen}
    />,

    <Stack.Screen name="VersionSettings" key="VersionSettings"
      options={{ title: 'Version Information', headerBackVisible: topLevelBack }}
      component={VersionSettingsScreen}
    />,

    <Stack.Screen name="CreditsSettings" key="CreditsSettings"
      options={{ title: 'Credits', headerBackVisible: topLevelBack }}
      component={CreditsSettingsScreen}
    />,

    <Stack.Screen name="DevModeSettings" key="DevModeSettings"
      options={{ title: 'Developer Settings', headerBackVisible: topLevelBack }}
      component={DevModeSettingsScreen}
    />,

    <Stack.Screen name="BandModeSettings" key="BandModeSettings"
      options={{ title: 'Bands & Modes' }}
      component={BandModeSettingsScreen}
    />,

    <Stack.Screen name="ExtensionScreen" key="ExtensionScreen"
      options={{ title: 'Extension' }}
      component={ExtensionScreen}
    />

  ]

  if (includeMain) {
    screens.unshift(
      <Stack.Screen name="MainSettingsOptions" key="MainSettings"
        options={{ title: 'Settings' }}
        component={MainSettingsOptionsScreen}
      />
    )
  }

  return screens
}
