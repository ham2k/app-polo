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

import 'react-native-gesture-handler' // This must be included in the top component file

import GLOBAL from './GLOBAL'

import { usePrepareThemes } from './styles/tools/usePrepareThemes'

import { persistor, store } from './store'
import { selectSettings } from './store/settings'

import { AppWrappedForDistribution, trackNavigation, useConfigForDistribution } from './distro'

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
import MainSettingsScreen from './screens/SettingsScreens/screens/MainSettingsScreen'
import SpotsScreen from './screens/SpotsScreen/SpotsScreen'
import OpInfoScreen from './screens/OperationScreens/OpInfoScreen'
import OperationDetailsScreen from './screens/OperationScreens/OpSettingsTab/OperationDetailsScreen'
import RootErrorBoundary from './screens/components/RootErrorBoundary'

const Stack = createNativeStackNavigator()

const paperSettings = {
  icon: props => <MaterialCommunityIcon {...props} />
}

function MainApp ({ navigationTheme }) {
  const [appState, setAppState] = useState('starting')

  const settings = useSelector(selectSettings)

  useConfigForDistribution({ settings })

  useEffect(() => { // Some top-level functions need access to settings info that's only available in the store at this point
    GLOBAL.consentAppData = settings.consentAppData
  }, [settings?.consentAppData])

  const routeNameRef = React.useRef()
  const navigationRef = React.useRef()

  if (appState === 'starting') {
    return <StartScreen setAppState={setAppState} />
  } else {
    return (
      <NavigationContainer
        theme={navigationTheme}
        ref={navigationRef}
        onReady={() => {
          if (routeNameRef.current === undefined) {
            trackNavigation({ settings, currentRouteName: navigationRef.current.getCurrentRoute().name })
          }
          routeNameRef.current = navigationRef.current.getCurrentRoute().name
        }}
        onStateChange={() => {
          const previousRouteName = routeNameRef.current
          const currentRouteName = navigationRef.current.getCurrentRoute().name
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

          <Stack.Screen name="OperationDetails"
            options={{ title: 'Operation Details', headerBackTitle: 'Operation' }}
            component={OperationDetailsScreen}
          />

          <Stack.Screen name="OperationStationInfo"
            options={{ title: 'Station Info', headerBackTitle: 'Operation' }}
            component={OperationStationInfoScreen}
          />

          <Stack.Screen name="OperationAddActivity"
            options={{ title: 'Add Activity', headerBackTitle: 'Operation' }}
            component={OperationAddActivityScreen}
          />

          <Stack.Screen name="OperationActivityOptions"
            options={{ title: 'Activity Options', headerBackTitle: 'Operation' }}
            component={OperationActivityOptionsScreen}
          />

          <Stack.Screen name="CallInfo"
            options={{ title: 'Callsign Info' }}
            component={CallInfoScreen}
          />

          <Stack.Screen name="Spots"
            options={{ title: 'Spots' }}
            component={SpotsScreen}
          />

          <Stack.Screen name="EditQSO"
            options={{ title: 'Edit QSO' }}
            component={EditQSOScreen}
          />

          <Stack.Screen name="OpInfo"
            options={{ title: 'Operation Info' }}
            component={OpInfoScreen}
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

function ErrorWrappedApp (props) {
  return (
    <RootErrorBoundary>
      <MainApp {...props} />
    </RootErrorBoundary>
  )
}

function ThemedApp () {
  const [paperTheme, navigationTheme] = usePrepareThemes()

  return (
    <PaperProvider theme={paperTheme} settings={paperSettings}>
      <ErrorWrappedApp navigationTheme={navigationTheme} />
    </PaperProvider>
  )
}

const App = () => (
  <AppWrappedForDistribution>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemedApp />
      </PersistGate>
    </Provider>
  </AppWrappedForDistribution>
)

export default App
