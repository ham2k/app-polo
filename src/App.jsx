import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { PaperProvider } from 'react-native-paper'

import { usePrepareThemes } from './styles/tools/usePrepareThemes'

import HomeScreen from './screens/HomeScreen/HomeScreen'
import LoggerScreen from './screens/LoggerScreen'
import SettingsScreen from './screens/SettingsScreen'

import { persistor, store } from './store'
import HeaderBar from './screens/components/HeaderBar'

const Stack = createNativeStackNavigator()

export default function App () {
  const [paperTheme, navigationTheme] = usePrepareThemes()

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider theme={paperTheme}>
          <NavigationContainer theme={navigationTheme}>
            <Stack.Navigator screenOptions={{
              header: HeaderBar,
              animation: 'slide_from_right'
              // headerStyle: {
              //   backgroundColor: navigationTheme.colors.primary
              // },
              // headerTintColor: paperTheme.colors.onPrimary,
              // headerTitleStyle: {
              //   fontWeight: 'bold'
              // }
            }}>
              <Stack.Screen name="Home" options={{ title: 'Ham2K', subTitle: 'Portable Logger' }} component={HomeScreen} />
              <Stack.Screen name="Logger" options={{ title: 'Logger', headerBackTitle: 'Home' }} component={LoggerScreen} />
              <Stack.Screen name="Settings" options={{ title: 'Settings', headerBackTitle: 'Home' }} component={SettingsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </PersistGate>
    </Provider>
  )
}
