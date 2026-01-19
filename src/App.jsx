/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { PaperProvider, Portal } from 'react-native-paper'
import MaterialCommunityIcon from '@react-native-vector-icons/material-design-icons'
import DeviceInfo from 'react-native-device-info'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { useTranslation } from 'react-i18next'
import { getLocales } from 'react-native-localize'

import 'react-native-gesture-handler' // This must be included in the top component file

import GLOBAL from './GLOBAL'

import { usePrepareThemes } from './styles/tools/usePrepareThemes'
import { BaseStylesContext, useBaseStyles, useThemedStyles } from './styles/tools/useThemedStyles'

import { persistor, store } from './store'
import { selectSettings, selectSettingsLanguage } from './store/settings'
import { useSyncLoop } from './store/sync'
import { selectLocalExtensionData } from './store/local'
import { selectRuntimeOnline } from './store/runtime'
import { selectFeatureFlags } from './store/system'
import { hotReloadSequence } from './store/runtime/actions/startupSequence'
import { selectGlobalDialog } from './store/ui'

import { AppWrappedForDistribution, trackNavigation, useConfigForDistribution, onNavigationReadyForDistribution } from './distro'

import RootErrorBoundary from './screens/components/RootErrorBoundary'
import HeaderBar from './screens/components/HeaderBar'
import StartScreen from './screens/StartScreen/StartScreen'
import HomeScreen from './screens/HomeScreen/HomeScreen'
import OperationScreen from './screens/OperationScreens/OperationScreen'
import EditQSOScreen from './screens/OperationScreens/EditQSOScreen'
import CallInfoScreen from './screens/CallInfoScreen/CallInfoScreen'
import OperationBadgeScreen from './screens/OperationBadgeScreen/OperationBadgeScreen'
import OperationAddActivityScreen from './screens/OperationScreens/OpSettingsTab/OperationAddActivityScreen'
import OperationActivityOptionsScreen from './screens/OperationScreens/OpSettingsTab/OperationActivityOptionsScreen'
import OperationStationInfoScreen from './screens/OperationScreens/OpSettingsTab/OperationStationInfoScreen'
import OperationDataScreen from './screens/OperationScreens/OpSettingsTab/OperationDataScreen'
import MainSettingsScreen from './screens/SettingsScreens/screens/MainSettingsScreen'
import SpotsScreen from './screens/SpotsScreen/SpotsScreen'
import OpInfoScreen from './screens/OperationScreens/OpInfoScreen'
import OperationDetailsScreen from './screens/OperationScreens/OpSettingsTab/OperationDetailsScreen'
import OperationLocationScreen from './screens/OperationScreens/OpSettingsTab/OperationLocationScreen'
import { GlobalDialog } from './ui/react-native/GlobalDialog'
import { initializeI18Next } from './i18n/i18n'

const Stack = createNativeStackNavigator()

const paperSettings = {
  icon: props => <MaterialCommunityIcon {...props} />
}

let _appHotReloaded = false
if (module.hot) {
  console.log('app module hot')
  module.hot.accept(() => {
    console.log('app hot reloaded')
    _appHotReloaded = true
  })
}

function MainApp ({ navigationTheme }) {
  const [appState, setAppState] = useState('starting')

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const styles = useThemedStyles()

  const flags = useSelector(selectFeatureFlags)
  const globalDialog = useSelector(selectGlobalDialog)
  const online = useSelector(selectRuntimeOnline)
  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

  useConfigForDistribution({ settings, flags })

  const { t, i18n } = useTranslation()

  useEffect(() => {
    setImmediate(async () => {
      GLOBAL.deviceId = GLOBAL.deviceId || (await DeviceInfo.syncUniqueId())
      GLOBAL.deviceName = GLOBAL.deviceName || (await DeviceInfo.getDeviceName())
    })
  }, [])

  useEffect(() => {
    // Some top-level functions need access to settings info that's only available in the store at this point,
    // so we set them in the GLOBAL object here.
    GLOBAL.consentAppData = settings.consentAppData
    GLOBAL.consentOpData = settings.consentOpData
    GLOBAL.syncEnabled = (lofiData?.enabled === false) ? false : (lofiData?.enabled || settings.consentAppData || settings.consentOpData)
    GLOBAL.flags = flags
    GLOBAL.t = t
    GLOBAL.language = i18n.language
    GLOBAL.locale = getLocales()[0].languageCode
  }, [settings.consentAppData, settings.consentOpData, lofiData?.enabled, flags, t, i18n.language, lofiData])

  useSyncLoop({ dispatch, settings, online, appState })

  const routeNameRef = React.useRef()
  const navigationRef = React.useRef()

  useEffect(() => {
    if (_appHotReloaded) {
      dispatch(hotReloadSequence)
      _appHotReloaded = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, _appHotReloaded])

  if (appState === 'starting') {
    return <StartScreen setAppState={setAppState} />
  } else {
    return (
      <Portal.Host>
        <NavigationContainer
          theme={navigationTheme}
          ref={navigationRef}
          onReady={() => {
            onNavigationReadyForDistribution(navigationRef)

            if (routeNameRef.current === undefined) {
              trackNavigation({ settings, currentRouteName: navigationRef.current?.getCurrentRoute()?.name })
            }
            routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name
          }}
          onStateChange={() => {
            const previousRouteName = routeNameRef.current
            const currentRouteName = navigationRef.current?.getCurrentRoute()?.name
            if (previousRouteName !== currentRouteName) {
              trackNavigation({ settings, currentRouteName, previousRouteName })
            }
            routeNameRef.current = currentRouteName
          }}
        >
          <Stack.Navigator
            id="RootNavigator"
            screenOptions={{
              header: HeaderBar,
              animation: 'slide_from_right',
              freezeOnBlur: true
            }}
          >
            <Stack.Screen name="Home"
              options={{ title: t('screens.home.title', 'Portable Logger'), navigationBarColor: styles.colors.primary }}
              component={HomeScreen}
            />

            <Stack.Screen name="Operation"
              options={{ title: t('screens.operation.title', 'Operation'), headerShown: false, headerBackTitle: 'Home', leftAction: 'close' }}
              component={OperationScreen}
            />

            <Stack.Screen name="OperationBadgeScreen"
              options={{ headerMode: 'none', headerShown: false }}
              component={OperationBadgeScreen}
            />

            <Stack.Screen name="OperationDetails"
              options={{ title: t('screens.operationDetails.title', 'Operation Details'), headerBackTitle: 'Operation' }}
              component={OperationDetailsScreen}
            />

            <Stack.Screen name="OperationStationInfo"
              options={{ title: t('screens.operationStationInfo.title', 'Station & Operator Info'), headerBackTitle: 'Operation' }}
              component={OperationStationInfoScreen}
            />

            <Stack.Screen name="OperationLocation"
              options={{ title: t('screens.operationLocation.title', 'Operation Location'), headerBackTitle: 'Operation' }}
              component={OperationLocationScreen}
            />

            <Stack.Screen name="OperationAddActivity"
              options={{ title: t('screens.operationAddActivity.title', 'Add Activity'), headerBackTitle: 'Operation' }}
              component={OperationAddActivityScreen}
            />

            <Stack.Screen name="OperationActivityOptions"
              options={{ title: t('screens.operationActivityOptions.title', 'Activity Options'), headerBackTitle: 'Operation' }}
              component={OperationActivityOptionsScreen}
            />

            <Stack.Screen name="OperationData"
              options={{ title: t('screens.operationData.title', 'Operation Data'), headerBackTitle: 'Operation' }}
              component={OperationDataScreen}
            />

            <Stack.Screen name="CallInfo"
              options={{ title: t('screens.callInfo.title', 'Callsign Info') }}
              component={CallInfoScreen}
            />

            <Stack.Screen name="Spots"
              options={{ title: t('screens.spots.title', 'Spots') }}
              component={SpotsScreen}
            />

            <Stack.Screen name="EditQSO"
              options={{ title: t('screens.editQSO.title', 'Edit QSO') }}
              component={EditQSOScreen}
            />

            <Stack.Screen name="OpInfo"
              options={{ title: t('screens.opInfo.title', 'Operation Info') }}
              component={OpInfoScreen}
            />

            <Stack.Screen name="Settings"
              options={{ title: t('screens.settings.title', 'Settings'), headerShown: false }}
              component={MainSettingsScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
        {(globalDialog?.title || globalDialog?.content) && <GlobalDialog {...globalDialog} />}
      </Portal.Host>
    )
  }
}

function TranslatedApp (props) {
  const language = useSelector(selectSettingsLanguage)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    initializeI18Next(language)
      .then(() => { setInitialized(true) })
      .catch((error) => { console.log('🌎 Error', error); setInitialized(true) })
  }, [language])

  if (!initialized) return null
  return <MainApp {...props} />
}

function ErrorWrappedApp (props) {
  return (
    <RootErrorBoundary>
      <TranslatedApp {...props} />
    </RootErrorBoundary>
  )
}

function ThemedApp () {
  const [paperTheme, navigationTheme] = usePrepareThemes()
  const baseStyles = useBaseStyles({ theme: paperTheme })

  return (
    <PaperProvider theme={paperTheme} settings={paperSettings}>
      <BaseStylesContext.Provider value={baseStyles}>
        <ErrorWrappedApp navigationTheme={navigationTheme} />
      </BaseStylesContext.Provider>
    </PaperProvider>
  )
}

const App = () => (
  <AppWrappedForDistribution>
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <KeyboardProvider>
          <SafeAreaProvider>
            <ThemedApp />
          </SafeAreaProvider>
        </KeyboardProvider>
      </PersistGate>
    </ReduxProvider>
  </AppWrappedForDistribution>
)

export default App
