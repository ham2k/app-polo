import React, { useEffect, useMemo } from 'react'

import { useDispatch, useSelector } from 'react-redux'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'

import ScreenContainer from '../components/ScreenContainer'
import { loadOperation, selectOperation } from '../../store/operations'
import OpLoggingTab from './OpLoggingTab/OpLoggingTab'
import OpStatsTab from './OpStatsTab.jsx/OpStatsTab'
import OpSettingsTab from './OpSettingsTab/OpSettingsTab'
import { useWindowDimensions } from 'react-native'
import { loadQSOs } from '../../store/qsos'

const Tab = createMaterialTopTabNavigator()

export default function OperationScreen ({ navigation, route }) {
  const dispatch = useDispatch()
  const operation = useSelector(selectOperation(route.params.operation.uuid))

  // When starting, make sure all operation data is loaded
  useEffect(() => {
    dispatch(loadQSOs(route.params.operation.uuid))
    dispatch(loadOperation(route.params.operation.uuid))
  }, [route.params.operation.uuid, dispatch])

  // When operation data is loaded, set the title
  useEffect(() => {
    if (operation?.call) {
      navigation.setOptions({ title: operation?.call, subTitle: operation?.name })
    } else {
      navigation.setOptions({ title: 'New Operation' })
    }
  }, [navigation, operation])

  const settingsOnly = useMemo(() => {
    return !operation.call
  }, [operation])

  // useEffect(() => {
  //   navigation.jumpTo('Settings')
  // }, [navigation, settingsOnly])

  const dimensions = useWindowDimensions()

  return (
    <ScreenContainer>
      <Tab.Navigator
        id={'OperationScreen_TabNavigator'}
        initialLayout={{ width: dimensions.width, height: dimensions.height }}
        initialRouteName={ settingsOnly ? 'Settings' : 'QSOs'}
        screenOptions={{
          tabBarItemStyle: { width: dimensions.width / 3 } // This allows tab titles to be rendered while the screen is transitioning in
        }}
      >
        <Tab.Screen
          name="QSOs"
          component={OpLoggingTab}
          initialParams={{ uuid: operation.uuid, operation }}
          listeners={{
            tabPress: e => { settingsOnly && e.preventDefault() }
          }}
        />

        <Tab.Screen
          name="Stats"
          component={OpStatsTab}
          initialParams={{ uuid: operation.uuid, operation }}
          listeners={{
            tabPress: e => { settingsOnly && e.preventDefault() }
          }}
        />

        <Tab.Screen
          name="Settings"
          component={OpSettingsTab}
          initialParams={{ uuid: operation.uuid, operation }}
        />
      </Tab.Navigator>
    </ScreenContainer>
  )
}
