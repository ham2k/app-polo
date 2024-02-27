import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { PaperProvider } from 'react-native-paper'
import SplashScreen from 'react-native-splash-screen'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import 'react-native-gesture-handler' // This must be included in the top component file

import { usePrepareThemes } from './styles/tools/usePrepareThemes'

import { persistor, store } from './store'
import HeaderBar from './screens/components/HeaderBar'

import HomeScreen from './screens/HomeScreen/HomeScreen'
import OperationScreen from './screens/OperationScreen'
import SettingsScreens from './screens/SettingsScreens'
import MainSettingsScreen from './screens/SettingsScreens/screens/MainSettingsScreen'
import DataFilesSettingsScreen from './screens/SettingsScreens/screens/DataFilesSettingsScreen'

const Stack = createNativeStackNavigator()

const paperSettings = {
  icon: props => <MaterialCommunityIcon {...props} />
}
export default function App () {
  const [paperTheme, navigationTheme] = usePrepareThemes()

  useEffect(() => {
    SplashScreen.hide()
  }, [])

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider theme={paperTheme} settings={paperSettings}>
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

              <Stack.Group>
                <Stack.Screen name="Settings" options={{ title: 'Settings' }} component={MainSettingsScreen} />
                <Stack.Screen name="DataFilesSettings" options={{ title: 'Data Files', headerBackTitle: 'MainSettings' }} component={DataFilesSettingsScreen} />
              </Stack.Group>

            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </PersistGate>
    </Provider>
  )
}
