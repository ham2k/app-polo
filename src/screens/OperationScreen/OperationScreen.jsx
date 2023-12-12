import React, { useEffect, useMemo } from 'react'

import { useDispatch, useSelector } from 'react-redux'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'

import ScreenContainer from '../components/ScreenContainer'
import { loadOperation, selectOperationInfo } from '../../store/operations'
import OpLoggingTab from './OpLoggingTab/OpLoggingTab'
import OpStatsTab from './OpStatsTab.jsx/OpStatsTab'
import OpSettingsTab from './OpSettingsTab/OpSettingsTab'
import { Dimensions } from 'react-native'

const Tab = createMaterialTopTabNavigator()

export default function OperationScreen ({ navigation, route }) {
  const dispatch = useDispatch()
  const operation = useSelector(selectOperationInfo(route.params.operation.uuid))

  // When starting, make sure all operation data is loaded
  useEffect(() => {
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

  return (
    <ScreenContainer>
      <Tab.Navigator
        id={'OperationScreen_TabNavigator'}
        initialLayout={{ width: Dimensions.get('window').width }}
        initialRouteName={ settingsOnly ? 'Settings' : 'QSOs'}
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
