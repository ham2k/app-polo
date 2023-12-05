import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { PaperProvider } from 'react-native-paper'

import { usePrepareThemes } from './styles/tools/usePrepareThemes'

import HomeScreen from './screens/HomeScreen/HomeScreen'
import OperationScreen from './screens/OperationScreen'
import SettingsScreen from './screens/SettingsScreen'

import { persistor, store } from './store'
import HeaderBar from './screens/components/HeaderBar'

import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

const Stack = createNativeStackNavigator()

const paperSettings = {
  icon: props => <MaterialCommunityIcon {...props} />
}
export default function App () {
  const [paperTheme, navigationTheme] = usePrepareThemes()

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider theme={paperTheme} settings={paperSettings}>
          <NavigationContainer theme={navigationTheme}>
            <Stack.Navigator screenOptions={{
              header: HeaderBar,
              animation: 'slide_from_right'
            }}>
              <Stack.Screen name="Home" options={{ title: 'Ham2K', subTitle: 'Portable Logger' }} component={HomeScreen} />
              <Stack.Screen name="Operation" options={{ title: 'Operation', headerBackTitle: 'Home', closeInsteadOfBack: true }} component={OperationScreen} />
              <Stack.Screen name="Settings" options={{ title: 'Settings', headerBackTitle: 'Home' }} component={SettingsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </PersistGate>
    </Provider>
  )
}
