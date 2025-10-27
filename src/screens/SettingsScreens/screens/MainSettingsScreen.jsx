/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useMemo, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Text } from 'react-native-paper'
import { Linking, ScrollView, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context'

import packageJson from '../../../../package.json'
import { findHooks } from '../../../extensions/registry'

import { selectSettings } from '../../../store/settings'
import { fetchFeatureFlags } from '../../../store/system/fetchFeatureFlags'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { H2kListItem, H2kListSection, H2kListSubheader } from '../../../ui'
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
import { selectLocalExtensionData } from '../../../store/local'

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

  const accountSettingHooks = useMemo(() => {
    const hooks = findHooks('setting').filter(hook => hook.category === 'account' && hook.SettingItem)
    return hooks
  }, [settings]) // eslint-disable-line react-hooks/exhaustive-deps

  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))
  const showSyncSettings = useMemo(() => {
    return lofiData?.account?.cutoff_date_millis &&
    (Date.now() - lofiData?.account?.cutoff_date_millis > 1000 * 60 * 60 * 24)
  }, [lofiData?.account?.cutoff_date_millis])

  return (
    <ScrollView style={{ flex: 1, marginLeft: safeAreaInsets.left, marginRight: splitView ? 0 : safeAreaInsets.right }}>
      <H2kListSection>

        <H2kListItem
          title="Operator Callsign"
          description={
            settings.operatorCall ? (
              <Text style={styles.text.callsign}>{settings.operatorCall ?? 'No call'}</Text>
            ) : (
              <Text style={{ color: 'red' }}>Please enter a callsign!</Text>
            )
          }
          leftIcon="card-account-details"
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

        <H2kListSubheader>Settings</H2kListSubheader>
        <H2kListItem
          title="General Settings"
          description={'Dark mode, numbers row, units, and more'}
          onPress={() => navigation.navigate('Settings', { screen: 'GeneralSettings' })}
          leftIcon="cogs"
        />

        <H2kListItem
          title="Logging Settings"
          description={'Customize the logging experience'}
          onPress={() => navigation.navigate('Settings', { screen: 'LoggingSettings' })}
          leftIcon="book-edit-outline"
        />

        <H2kListItem
          title="Data Settings"
          description="Data files, callsign notes, and more"
          onPress={() => navigation.navigate('Settings', { screen: 'DataSettings' })}
          leftIcon="file-cabinet"
        />

        {(settings.devMode || showSyncSettings) && (
          <H2kListItem
            title="Sync Settings"
            description="Cloud sync and backup"
            onPress={() => navigation.navigate('Settings', { screen: 'SyncSettings' })}
            leftIcon="sync"
          />
        )}

        <H2kListItem
          title="App Features"
          description={'Manage features like POTA, SOTA, etc'}
          onPress={() => navigation.navigate('Settings', { screen: 'FeaturesSettings' })}
          leftIcon="format-list-bulleted"
        />

        {settings.devMode && (
          <H2kListItem
            title="Developer Settings"
            description={'Here be dragons'}
            onPress={() => navigation.navigate('Settings', { screen: 'DevModeSettings' })}
            leftIcon="fire"
            leftIconColor={styles.colors.devMode}
          />
        )}

      </H2kListSection>

      <H2kListSection>
        <H2kListSubheader>Accounts</H2kListSubheader>

        <H2kListItem
          title="QRZ (for callsign lookups)"
          description={settings?.accounts?.qrz ? `Login: ${settings.accounts.qrz.login}` : 'No account'}
          leftIcon="web"
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
        {settings.wavelogExperiments && (
          <H2kListItem
            title="Wavelog Settings"
            description={'Configure Wavelog API connection'}
            onPress={() => navigation.navigate('Settings', { screen: 'WavelogSettings' })}
            leftIcon="cloud-upload-outline"
            leftIconColor={styles.colors.devMode}
          />
        )}
      </H2kListSection>

      <MainSettingsForDistribution settings={settings} styles={styles} />

      <H2kListSection>
        <H2kListSubheader>About Ham2K</H2kListSubheader>
        <H2kListItem
          title={packageJson.versionName ? `${packageJson.versionName} Release` : `Version ${packageJson.version}`}
          description={'See recent changes'}
          onPress={() => navigation.navigate('Settings', { screen: 'VersionSettings' })}
          leftIcon="information-outline"
        />
        <H2kListItem
          title="Credits"
          description={'Sebastián Delmont KI2D & Team PoLo'}
          onPress={() => navigation.navigate('Settings', { screen: 'CreditsSettings' })}
          leftIcon="account-group"
        />
        <H2kListItem
          title="Recent Notices"
          description={'Messages you might have missed?'}
          onPress={() => navigation.navigate('Settings', { screen: 'NoticesSettings' })}
          leftIcon="bell-outline"
        />
      </H2kListSection>

      <H2kListSection style={{ marginBottom: safeAreaInsets.bottom }}>
        <H2kListSubheader>Need Help?</H2kListSubheader>
        <H2kListItem
          title="Read The Fine Manual"
          description={'Browse the documentation for PoLo'}
          onPress={async () => await Linking.openURL('https://polo.ham2k.com/docs/')}
          leftIcon="file-document-multiple-outline"
        />
        <H2kListItem
          title="Ham2K Forums"
          description={'Find help, give feedback, discuss ideas…'}
          onPress={async () => await Linking.openURL('https://forums.ham2k.com/')}
          leftIcon="forum-outline"
        />
        <H2kListItem
          title="Ham2K Chat"
          description={'The discord server for our online community'}
          onPress={async () => await Linking.openURL('https://discord.gg/c4Th9QkByJ')}
          leftIcon="chat-outline"
        />
        <H2kListItem
          title="Ham2K YouTube"
          description={'Videos and Live Streams'}
          onPress={async () => await Linking.openURL('https://www.youtube.com/@Ham2KApps')}
          leftIcon="youtube"
        />
        <H2kListItem
          title="Ham2K Instagram"
          description={'Because you cannot have too many photos…'}
          onPress={async () => await Linking.openURL('https://www.instagram.com/ham2kapps/')}
          leftIcon="instagram"
        />
        <H2kListItem
          title="Ham2K BlueSky"
          description={'Follow us for news and updates'}
          onPress={async () => await Linking.openURL('https://bsky.app/profile/ham2k.com')}
          leftIcon="butterfly-outline"
        />
        <H2kListItem
          title="Contact Us"
          description={'help@ham2k.com\n   (but try the Forums or Chat first!)'}
          onPress={async () => await Linking.openURL('mailto:help@ham2k.com')}
          leftIcon="email-alert-outline"
        />
      </H2kListSection>

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
