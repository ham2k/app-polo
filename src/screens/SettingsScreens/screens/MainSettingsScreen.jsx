/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useMemo, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List, Text } from 'react-native-paper'
import { Linking, ScrollView, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context'

import packageJson from '../../../../package.json'
import { findHooks } from '../../../extensions/registry'

import { selectSettings } from '../../../store/settings'
import { fetchFeatureFlags } from '../../../store/system/fetchFeatureFlags'
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
import ExportSettingsScreen from './ExportSettingsScreen'
import ExtensionScreen from './ExtensionScreen'
import FeaturesSettingsScreen from './FeaturesSettingsScreen'
import GeneralSettingsScreen from './GeneralSettingsScreen'
import LoggingSettingsScreen from './LoggingSettingsScreen'
import VersionSettingsScreen from './VersionSettingsScreen'
import SyncSettingsScreen from './SyncSettingsScreen'
import WavelogSettingsScreen from './WavelogSettingsScreen'

import { MainSettingsForDistribution } from '../../../distro'
import NoticesSettingsScreen from './NoticesSettingsScreen'

const Stack = createNativeStackNavigator()

export default function MainSettingsScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const dispatch = useDispatch()
  useEffect(() => {
    // Refresh feature flags when the settings screen is opened, or if callsign changes
    dispatch(fetchFeatureFlags())
  }, [dispatch, settings?.operatorCall])

  const headerOptions = useMemo(() => {
    let options = {}
    options = { title: 'Settings' }
    options.closeInsteadOfBack = true
    return options
  }, [])

  const dimensions = useSafeAreaFrame()
  // const dimensions = useWindowDimensions() <-- broken on iOS, no rotation

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
              <HeaderBar options={headerOptions} navigation={navigation} back={true} splitView={splitView} />
              <MainSettingsOptions settings={settings} styles={styles} navigation={navigation} splitView={splitView} />
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
                initialRouteName={route?.params?.screen ?? 'GeneralSettings'}
                screenOptions={{
                  header: HeaderBar,
                  animation: 'slide_from_right',
                  freezeOnBlur: true
                }}
              >
                {settingsScreensArray({ includeMain: false, topLevelBack: false, splitView })}
              </Stack.Navigator>
            </View>
          </View>
        </ScreenContainer>
      </>
    )
  } else {
    return (
      <Stack.Navigator
        id="SettingsNavigator"
        initialRouteName={route?.params?.screen ?? 'MainSettingsOptions'}
        screenOptions={{
          header: HeaderBar,
          animation: 'slide_from_right',
          freezeOnBlur: true
        }}
      >
        {settingsScreensArray({ includeMain: true, topLevelBack: true })}
      </Stack.Navigator>
    )
  }
}

function MainSettingsOptions ({ settings, styles, navigation, splitView }) {
  const safeAreaInsets = useSafeAreaInsets()
  const [currentDialog, setCurrentDialog] = useState()
  console.log('safe area', safeAreaInsets)
  const accountSettingHooks = useMemo(() => {
    const hooks = findHooks('setting').filter(hook => hook.category === 'account' && hook.SettingItem)
    return hooks
  }, [settings]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScrollView style={{ flex: 1, marginLeft: safeAreaInsets.left, marginRight: splitView ? 0 : safeAreaInsets.right }}>
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
          onPress={() => navigation.navigate('Settings', { screen: 'GeneralSettings' })}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cogs" />}
        />

        <Ham2kListItem
          title="Logging Settings"
          description={'Customize the logging experience'}
          onPress={() => navigation.navigate('Settings', { screen: 'LoggingSettings' })}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="book-edit-outline" />}
        />

        <Ham2kListItem
          title="Data Settings"
          description="Data files, callsign notes, and more"
          onPress={() => navigation.navigate('Settings', { screen: 'DataSettings' })}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-cabinet" />}
        />

        {settings.devMode && (
          <Ham2kListItem
            title="Sync Settings"
            description="Cloud sync and backup"
            onPress={() => navigation.navigate('Settings', { screen: 'SyncSettings' })}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} color={styles.colors.devMode} icon="sync" />}
          />
        )}

        <Ham2kListItem
          title="App Features"
          description={'Manage features like POTA, SOTA, etc'}
          onPress={() => navigation.navigate('Settings', { screen: 'FeaturesSettings' })}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="format-list-bulleted" />}
        />

        {settings.devMode && (
          <Ham2kListItem
            title="Developer Settings"
            description={'Here be dragons'}
            onPress={() => navigation.navigate('Settings', { screen: 'DevModeSettings' })}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="fire" color={styles.colors.devMode} />}
          />
        )}

        <Ham2kListItem
          title="Wavelog Settings"
          description={'Configure Wavelog API connection'}
          onPress={() => navigation.navigate('Settings', { screen: 'WavelogSettings' })}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cloud-upload-outline" />}
        />

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
        {accountSettingHooks.map((hook) => (
          <hook.SettingItem key={hook.key} settings={settings} styles={styles} />
        ))}
      </Ham2kListSection>

      <MainSettingsForDistribution settings={settings} styles={styles} />

      <Ham2kListSection>
        <Ham2kListSubheader>About Ham2K</Ham2kListSubheader>
        <Ham2kListItem
          title={packageJson.versionName ? `${packageJson.versionName} Release (${packageJson.version})` : `Version ${packageJson.version}`}
          description={'See recent changes'}
          onPress={() => navigation.navigate('Settings', { screen: 'VersionSettings' })}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="information-outline" />}
        />
        <Ham2kListItem
          title="Credits"
          description={'Sebastián Delmont KI2D & Team PoLo'}
          onPress={() => navigation.navigate('Settings', { screen: 'CreditsSettings' })}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account-group" />}
        />
        <Ham2kListItem
          title="Recent Notices"
          description={'Messages you might have missed?'}
          onPress={() => navigation.navigate('Settings', { screen: 'NoticesSettings' })}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="bell-outline" />}
        />
      </Ham2kListSection>

      <Ham2kListSection style={{ marginBottom: safeAreaInsets.bottom }}>
        <Ham2kListSubheader>Need Help?</Ham2kListSubheader>
        <Ham2kListItem
          title="Read The Fine Manual"
          description={'Browse the documentation for PoLo'}
          onPress={async () => await Linking.openURL('https://polo.ham2k.com/docs/')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-document-multiple-outline" />}
        />
        <Ham2kListItem
          title="Ham2K Forums"
          description={'Find help, give feedback, discuss ideas…'}
          onPress={async () => await Linking.openURL('https://forums.ham2k.com/')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="forum-outline" />}
        />
        <Ham2kListItem
          title="Ham2K Chat"
          description={'The discord server for our online community'}
          onPress={async () => await Linking.openURL('https://discord.gg/c4Th9QkByJ')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="chat-outline" />}
        />
        <Ham2kListItem
          title="Ham2K YouTube"
          description={'Videos and Live Streams'}
          onPress={async () => await Linking.openURL('https://www.youtube.com/@Ham2KApps')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="youtube" />}
        />
        <Ham2kListItem
          title="Ham2K Instagram"
          description={'Because you cannot have too many photos…'}
          onPress={async () => await Linking.openURL('https://www.instagram.com/ham2kapps/')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="instagram" />}
        />
        <Ham2kListItem
          title="Ham2K BlueSky"
          description={'Follow us for news and updates'}
          onPress={async () => await Linking.openURL('https://bsky.app/profile/ham2k.com')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="butterfly-outline" />}
        />
        <Ham2kListItem
          title="Contact Us"
          description={'help@ham2k.com\n   (but try the Forums or Chat first!)'}
          onPress={async () => await Linking.openURL('mailto:help@ham2k.com')}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="email-alert-outline" />}
        />
      </Ham2kListSection>

      <View style={{ height: safeAreaInsets.bottom }} />

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
      splitView={false}
    />
  )
}

function settingsScreensArray ({ includeMain, topLevelBack, splitView }) {
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

    <Stack.Screen name="SyncSettings" key="SyncSettings"
      options={{ title: 'Sync Settings', headerBackVisible: topLevelBack }}
      component={SyncSettingsScreen}
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

    <Stack.Screen name="ExportSettings" key="ExportSettings"
      options={{ title: 'Export Settings' }}
      component={ExportSettingsScreen}
    />,

    <Stack.Screen name="NoticesSettings" key="NoticesSettings"
      options={{ title: 'Recent Notices' }}
      component={NoticesSettingsScreen}
    />,

    <Stack.Screen name="ExtensionScreen" key="ExtensionScreen"
      options={{ title: 'Extension' }}
      component={ExtensionScreen}
    />,

    <Stack.Screen name="WavelogSettings" key="WavelogSettings"
      options={{ title: 'Wavelog Settings', headerBackVisible: topLevelBack }}
      component={WavelogSettingsScreen}
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
