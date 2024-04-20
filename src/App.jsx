/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Provider, useSelector } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { PaperProvider } from 'react-native-paper'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import codePush from 'react-native-code-push'
import { Provider as RollbarProvider, ErrorBoundary } from '@rollbar/react'

import 'react-native-gesture-handler' // This must be included in the top component file

import { usePrepareThemes } from './styles/tools/usePrepareThemes'

import { persistor, store } from './store'
import { selectSettings } from './store/settings'
import HeaderBar from './screens/components/HeaderBar'

import StartScreen from './screens/StartScreen/StartScreen'
import HomeScreen from './screens/HomeScreen/HomeScreen'
import OperationScreen from './screens/OperationScreens/OperationScreen'
import OperationAddActivityScreen from './screens/OperationScreens/OperationAddActivityScreen'
import OperationActivityOptionsScreen from './screens/OperationScreens/OperationActivityOptionsScreen'
import OperationBadgeScreen from './screens/OperationBadgeScreen/OperationBadgeScreen'
import MainSettingsScreen from './screens/SettingsScreens/screens/MainSettingsScreen'

const GLOBAL_APP_SETTINGS = {
  consentAppData: false
}

const DISTRIBUTION_CONFIG = {}

/** EXAMPLE CODEPUSH CONFIG */
// DISTRIBUTION_CONFIG.codePushOptions = {
//   installMode: codePush.InstallMode.IMMEDIATE
// }

/** EXAMPLE ROLLBAR CONFIG */
// import { Client } from 'rollbar-react-native'
// DISTRIBUTION_CONFIG.rollbarNative = new Client({
//   accessToken: Config.ROLLBAR_TOKEN,
//   captureUncaught: true,
//   captureUnhandledRejections: true
// })

export function reportError (error, ...extra) {
  if (GLOBAL_APP_SETTINGS.consentAppData && DISTRIBUTION_CONFIG.rollbarNative && DISTRIBUTION_CONFIG.rollbarNative.rollbar) {
    DISTRIBUTION_CONFIG.rollbarNative.rollbar.error(error, ...extra)
  }
  console.error(error, ...extra)
  if (extra && extra[0]?.stack) console.error(extra[0].stack)
}

const Stack = createNativeStackNavigator()

const paperSettings = {
  icon: props => <MaterialCommunityIcon {...props} />
}

function MainApp ({ navigationTheme }) {
  const [appState, setAppState] = useState('starting')

  const settings = useSelector(selectSettings)
  useEffect(() => { // Some top-level functions need access to settings info that's only available in the store at this point
    GLOBAL_APP_SETTINGS.consentAppData = settings.consentAppData
  }, [settings?.consentAppData])

  if (appState === 'starting') {
    return <StartScreen setAppState={setAppState} />
  } else {
    return (
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          id="RootNavigator"
          screenOptions={{
            header: HeaderBar,
            animation: 'slide_from_right'
          }}
        >
          <Stack.Screen name="Home"
            options={{ title: 'Portable Logger' }}
            component={HomeScreen}
          />

          <Stack.Screen name="Operation"
            options={{ title: 'Operation', headerShown: false, headerBackTitle: 'Home', closeInsteadOfBack: true }}
            component={OperationScreen}
          />

          <Stack.Screen name="OperationBadgeScreen"
            options={{ headerMode: 'none', headerShown: false }}
            component={OperationBadgeScreen}
          />

          <Stack.Screen name="OperationAddActivity"
            options={{ title: 'Add Activity', headerBackTitle: 'Operation' }}
            component={OperationAddActivityScreen}
          />

          <Stack.Screen name="OperationActivityOptions"
            options={{ title: 'Activity Options', headerBackTitle: 'Operation' }}
            component={OperationActivityOptionsScreen}
          />

          <Stack.Screen name="Settings"
            options={{ title: 'Settings', headerShown: false }}
            component={MainSettingsScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    )
  }
}

function ThemedApp () {
  const [paperTheme, navigationTheme] = usePrepareThemes()

  return (
    <PaperProvider theme={paperTheme} settings={paperSettings}>
      <MainApp navigationTheme={navigationTheme} />
    </PaperProvider>
  )
}

const PersistedApp = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ThemedApp />
    </PersistGate>
  </Provider>
)

let App
if (DISTRIBUTION_CONFIG.rollbarNative && DISTRIBUTION_CONFIG.rollbarNative.rollbar) {
  App = () => (
    <RollbarProvider instance={DISTRIBUTION_CONFIG.rollbarNative.rollbar}>
      <ErrorBoundary>
        <PersistedApp />
      </ErrorBoundary>
    </RollbarProvider>
  )
} else {
  App = PersistedApp
}

if (DISTRIBUTION_CONFIG.codePushOptions) {
  App = codePush(DISTRIBUTION_CONFIG.codePushOptions)(App)
}

export default App
