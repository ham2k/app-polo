import React, { useEffect, useMemo } from 'react'

import { useDispatch, useSelector } from 'react-redux'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'

import ScreenContainer from '../components/ScreenContainer'
import { loadOperation, selectOperation } from '../../store/operations'
import OpLoggingTab from './OpLoggingTab/OpLoggingTab'
import OpSettingsTab from './OpSettingsTab/OpSettingsTab'
import { Platform, useWindowDimensions } from 'react-native'
import { loadQSOs } from '../../store/qsos'
import { selectSettings } from '../../store/settings'
import OpSpotsTab from './OpSpotsTab.jsx/OpSpotsTab'
import { startTickTock } from '../../store/time'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import KeepAwake from '@sayem314/react-native-keep-awake'

const Tab = createMaterialTopTabNavigator()

export default function OperationScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const settings = useSelector(selectSettings)

  useEffect(() => { // Ensure the clock is ticking
    dispatch(startTickTock())
  }, [dispatch])

  useEffect(() => { // When starting, make sure all operation data is loaded
    dispatch(loadQSOs(route.params.operation.uuid))
    dispatch(loadOperation(route.params.operation.uuid))
  }, [route.params.operation.uuid, dispatch])

  useEffect(() => { // When operation data is loaded, set the title
    if (operation?.stationCall || settings?.operatorCall) {
      navigation.setOptions({ title: (operation?.stationCall || settings?.operatorCall) + ` ${operation?.title}`, subTitle: operation.subtitle })
    } else {
      navigation.setOptions({ title: 'New Operation' })
    }
  }, [navigation, operation, settings])

  const settingsOnly = useMemo(() => {
    return route.params.isNew || (!operation.stationCall && !settings?.operatorCall)
  }, [operation, settings, route.params.isNew])

  const dimensions = useWindowDimensions()

  return (
    <ScreenContainer>
      {settings.keepDeviceAwake && <KeepAwake />}
      <Tab.Navigator
        id={'OperationScreen_TabNavigator'}
        initialLayout={{ width: dimensions.width, height: dimensions.height }}
        initialRouteName={ settingsOnly ? 'Settings' : 'QSOs'}
        screenOptions={{
          tabBarItemStyle: [{ width: dimensions.width / 3 }, styles.screenTabBarItem, { minHeight: styles.oneSpace * 5, padding: 0 }], // This allows tab titles to be rendered while the screen is transitioning in
          tabBarLabelStyle: styles.screenTabBarLabel,
          tabBarStyle: styles.screenTabBar,
          tabBarIndicatorStyle: { backgroundColor: styles.colors.primaryLighter, height: styles.halfSpace * 1.5 },
          // See https://github.com/react-navigation/react-navigation/issues/11301
          // on iOS, if the keyboard is open, tabs get stuck when switching
          animationEnabled: Platform.OS !== 'ios'
        }}
      >
        <Tab.Screen
          name="Settings"
          options={{ title: 'Info' }}
          component={OpSettingsTab}
          initialParams={{ uuid: operation.uuid, operation }}
        />

        <Tab.Screen
          name="QSOs"
          component={OpLoggingTab}
          initialParams={{ uuid: operation.uuid, operation }}
          // listeners={{
          //   tabPress: e => { settingsOnly && e.preventDefault() }
          // }}
        />

        <Tab.Screen
          name="Spots"
          component={OpSpotsTab}
          initialParams={{ uuid: operation.uuid, operation }}
          // listeners={{
          //   tabPress: e => { settingsOnly && e.preventDefault() }
          // }}
        />

      </Tab.Navigator>
    </ScreenContainer>
  )
}
