import React, { useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { PaperProvider } from 'react-native-paper'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import codePush from 'react-native-code-push'
import { Provider as RollbarProvider, ErrorBoundary } from '@rollbar/react'

import 'react-native-gesture-handler' // This must be included in the top component file

import { usePrepareThemes } from './styles/tools/usePrepareThemes'

import { persistor, store } from './store'
import HeaderBar from './screens/components/HeaderBar'

import HomeScreen from './screens/HomeScreen/HomeScreen'
import OperationScreen from './screens/OperationScreens/OperationScreen'
import MainSettingsScreen from './screens/SettingsScreens/screens/MainSettingsScreen'
import DataFilesSettingsScreen from './screens/SettingsScreens/screens/DataFilesSettingsScreen'
import OperationAddActivityScreen from './screens/OperationScreens/OperationAddActivityScreen'
import OperationActivityOptionsScreen from './screens/OperationScreens/OperationActivityOptionsScreen'
import VersionSettingsScreen from './screens/SettingsScreens/screens/VersionSettingsScreen'
import LoggingSettingsScreen from './screens/SettingsScreens/screens/LoggingSettingsScreen'
import StartScreen from './screens/StartScreen/StartScreen'
import FeaturesSettingsScreen from './screens/SettingsScreens/screens/FeaturesSettingsScreen'
import GeneralSettingsScreen from './screens/SettingsScreens/screens/GeneralSettingsScreen'

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
  if (DISTRIBUTION_CONFIG.rollbarNative && DISTRIBUTION_CONFIG.rollbarNative.rollbar) {
    DISTRIBUTION_CONFIG.rollbarNative.rollbar.error(error, ...extra)
  }
  console.error(error, ...extra)
}

const Stack = createNativeStackNavigator()

const paperSettings = {
  icon: props => <MaterialCommunityIcon {...props} />
}

function MainApp ({ navigationTheme }) {
  const [appState, setAppState] = useState('starting')

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
            options={{ title: 'Operation', headerBackTitle: 'Home', closeInsteadOfBack: true }}
            component={OperationScreen}
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
            options={{ title: 'Settings' }}
            component={MainSettingsScreen}
          />

          <Stack.Screen name="FeaturesSettings"
            options={{ title: 'App Features', headerBackTitle: 'MainSettings' }}
            component={FeaturesSettingsScreen}
          />

          <Stack.Screen name="GeneralSettings"
            options={{ title: 'General Settings', headerBackTitle: 'MainSettings' }}
            component={GeneralSettingsScreen}
          />

          <Stack.Screen name="LoggingSettings"
            options={{ title: 'Logging Settings', headerBackTitle: 'MainSettings' }}
            component={LoggingSettingsScreen}
          />

          <Stack.Screen name="DataFilesSettings"
            options={{ title: 'Data Files', headerBackTitle: 'MainSettings' }}
            component={DataFilesSettingsScreen}
          />

          <Stack.Screen name="VersionSettings"
            options={{ title: 'Version Information', headerBackTitle: 'MainSettings' }}
            component={VersionSettingsScreen}
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
