/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Platform, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import KeepAwake from '@sayem314/react-native-keep-awake'

import { loadOperation, selectOperation } from '../../store/operations'
import { loadQSOs } from '../../store/qsos'
import { selectSettings } from '../../store/settings'
import { startTickTock, stopTickTock } from '../../store/time'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import HeaderBar from '../components/HeaderBar'
import OpLoggingTab from './OpLoggingTab/OpLoggingTab'
import OpSettingsTab from './OpSettingsTab/OpSettingsTab'
import OpSpotsTab from './OpSpotsTab/OpSpotsTab'
import OpMapTab from './OpMapTab/OpMapTab'
import OpInfoTab from './OpInfoTab/OpInfoTab'

const Tab = createMaterialTopTabNavigator()

export default function OperationScreen (props) {
  const { navigation, route } = props
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const suggestedQSO = route?.params?.qso
  const settings = useSelector(selectSettings)

  useEffect(() => { // Ensure the clock is ticking
    dispatch(startTickTock())
    return () => dispatch(stopTickTock())
  }, [dispatch])

  useEffect(() => { // When starting, make sure all operation data is loaded
    dispatch(loadQSOs(route.params.operation.uuid))
    dispatch(loadOperation(route.params.operation.uuid))
  }, [route.params.operation.uuid, dispatch])

  const headerOptions = useMemo(() => {
    let options = {}
    if (operation?.stationCall) {
      options = { title: (operation?.stationCall) + ` ${operation?.title}`, subTitle: operation.subtitle }
    } else {
      options = { title: 'New Operation' }
    }
    options.closeInsteadOfBack = true
    return options
  }, [operation?.stationCall, operation.subtitle, operation?.title])

  const dimensions = useWindowDimensions()

  const splitView = useMemo(() => {
    return !settings.dontSplitViews && (dimensions.width / styles.oneSpace > 95)
  }, [dimensions?.width, styles?.oneSpace, settings?.dontSplitViews])

  const [splitWidth] = useState(splitView ? Math.max(dimensions.width * 0.60, dimensions.width - styles.oneSpace * 40) : dimensions.width)

  if (splitView) {
    return (
      <>
        {settings.keepDeviceAwake && <KeepAwake />}
        <ScreenContainer>
          <View style={{ height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
            <View
              style={{
                width: splitWidth,
                height: '100%',
                borderColor: styles.colors.primary,
                borderRightWidth: styles.oneSpace
              }}
            >
              <HeaderBar options={headerOptions} navigation={navigation} back={true} />
              <OpLoggingTab navigation={navigation} route={{ params: { operation, qso: suggestedQSO, splitView } }} />
            </View>
            <SafeAreaView
              edges={['top']}
              style={{
                backgroundColor: styles.colors.primary,
                flex: 1,
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'stretch'
              }}
            >
              <Tab.Navigator
                id={'OperationScreen_TabNavigator'}
                initialLayout={{ width: splitWidth, height: dimensions.height }}
                initialRouteName={ operation?.qsoCount > 0 ? 'OpInfo' : 'OpSettings' }
                screenOptions={{
                  tabBarItemStyle: [{ width: (dimensions.width - splitWidth) / 4 }, styles.screenTabBarItem, { minHeight: styles.oneSpace * 6, padding: 0 }], // This allows tab titles to be rendered while the screen is transitioning in
                  tabBarLabelStyle: styles.screenTabBarLabel,
                  tabBarStyle: styles.screenTabBar,
                  tabBarIndicatorStyle: { backgroundColor: styles.colors.primaryHighlight, height: styles.halfSpace * 1.5 },
                  // See https://github.com/react-navigation/react-navigation/issues/11301
                  // on iOS, if the keyboard is open, tabs get stuck when switching
                  animationEnabled: Platform.OS !== 'ios',
                  lazy: true
                }}
              >
                <Tab.Screen
                  name="OpInfo"
                  options={{ title: 'Info' }}
                  component={OpInfoTab}
                  initialParams={{ uuid: operation.uuid, operation }}
                />

                <Tab.Screen
                  name="OpSpots"
                  options={{ title: 'Spots' }}
                  component={OpSpotsTab}
                  initialParams={{ uuid: operation.uuid, operation, splitView }}
                  screenOptions={{ lazy: true }}
                />

                <Tab.Screen
                  name="OpMap"
                  options={{ title: 'Map' }}
                  component={OpMapTab}
                  initialParams={{ uuid: operation.uuid, operation, splitView }}
                  screenOptions={{ lazy: true }}
                  splitView={splitView}
                />

                <Tab.Screen
                  name="OpSettings"
                  options={{ title: (dimensions.width / 4) > (styles.oneSpace * 34) ? 'Operation' : 'Oper.' }}
                  component={OpSettingsTab}
                  initialParams={{ uuid: operation.uuid, operation, splitView }}
                  splitView={splitView}
                />

              </Tab.Navigator>
            </SafeAreaView>

          </View>
        </ScreenContainer>
      </>
    )
  } else {
    return (
      <>
        <HeaderBar options={headerOptions} navigation={navigation} back={true} />

        {settings.keepDeviceAwake && <KeepAwake />}
        <ScreenContainer>
          <View style={{ height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
            <Tab.Navigator
              id={'OperationScreen_TabNavigator'}
              initialLayout={{ width: splitWidth, height: dimensions.height }}
              initialRouteName={ operation?.stationCall && operation?.qsoCount > 0 ? 'OpLog' : 'OpSettings' }
              screenOptions={{
                tabBarItemStyle: [{ width: dimensions.width / 4 }, styles.screenTabBarItem, { minHeight: styles.oneSpace * 4, padding: 0 }], // This allows tab titles to be rendered while the screen is transitioning in
                tabBarLabelStyle: styles.screenTabBarLabel,
                tabBarStyle: styles.screenTabBar,
                tabBarIndicatorStyle: { backgroundColor: styles.colors.primaryLighter, height: styles.halfSpace * 1.5 },
                // See https://github.com/react-navigation/react-navigation/issues/11301
                // on iOS, if the keyboard is open, tabs get stuck when switching
                animationEnabled: Platform.OS !== 'ios',
                lazy: true
              }}
            >
              <Tab.Screen
                name="OpLog"
                options={{ title: 'QSOs' }}
                component={OpLoggingTab}
                initialParams={{ uuid: operation.uuid, operation }}
              />

              <Tab.Screen
                name="OpSpots"
                options={{ title: 'Spots' }}
                component={OpSpotsTab}
                initialParams={{ uuid: operation.uuid, operation }}
                screenOptions={ { lazy: true }}
              />

              <Tab.Screen
                name="OpMap"
                options={{ title: 'Map' }}
                component={OpMapTab}
                initialParams={{ uuid: operation.uuid, operation }}
                screenOptions={ { lazy: true }}
              />

              <Tab.Screen
                name="OpSettings"
                options={{ title: (dimensions.width / 4) > (styles.oneSpace * 10.5) ? 'Operation' : 'Oper.' }}
                component={OpSettingsTab}
                initialParams={{ uuid: operation.uuid, operation }}
              />

            </Tab.Navigator>
          </View>
        </ScreenContainer>
      </>
    )
  }
}
