import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

import HomeScreen from './screens/HomeScreen/HomeScreen'
import LoggerScreen from './screens/LoggerScreen'
import SettingsScreen from './screens/SettingsScreen'

import COLORS from './styles/colors'

import { persistor, store } from './store'

const Stack = createNativeStackNavigator()

export default function App () {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.primary.bg
            },
            headerTintColor: COLORS.primary.bgText,
            headerTitleStyle: {
              fontWeight: 'bold'
            }
          }}>
            <Stack.Screen name="Home" options={{ title: 'Ham2K Portable Logger' }} component={HomeScreen} />
            <Stack.Screen name="Logger" options={{ title: 'Logger', headerBackTitle: 'Home' }} component={LoggerScreen} />
            <Stack.Screen name="Settings" options={{ title: 'Logger', headerBackTitle: 'Home' }} component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
    </PersistGate>
  </Provider>
  )
}
