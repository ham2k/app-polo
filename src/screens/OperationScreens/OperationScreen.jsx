/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Animated, PanResponder, Platform, View, useWindowDimensions } from 'react-native'
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
import { trackOperation } from '../../distro'
import { selectRuntimeOnline } from '../../store/runtime'
import { useUIState } from '../../store/ui'
import { Icon } from 'react-native-paper'
import { slashZeros } from '../../tools/stringTools'

const Tab = createMaterialTopTabNavigator()

const MIN_WIDTH_LEFT = 60
const MIN_WIDTH_RIGHT = 40

export default function OperationScreen (props) {
  const { navigation, route } = props
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const suggestedQSO = route?.params?.qso
  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)

  useEffect(() => { // Ensure the clock is ticking
    dispatch(startTickTock())
    return () => dispatch(stopTickTock())
  }, [dispatch])

  useEffect(() => { // When starting, make sure all operation data is loaded
    setImmediate(async () => {
      await dispatch(loadOperation(route.params.operation.uuid))
      await dispatch(loadQSOs(route.params.operation.uuid))
    })
  }, [route.params.operation.uuid, dispatch])

  const [lastTracking, setLastTracking] = useState(0)
  useEffect(() => {
    if (Date.now() - lastTracking > 1000 * 60 * 5 && online) {
      trackOperation({ settings, operation })
      setLastTracking(Date.now())
    }
  }, [settings, operation, lastTracking, online])

  const headerOptions = useMemo(() => {
    let options = {}
    if (operation?.stationCall) {
      options = {
        title: buildTitleForOperation({ operatorCall: operation.operatorCall, stationCall: operation.stationCall, title: operation.title, userTitle: operation.userTitle }),
        subTitle: operation.subtitle
      }
    } else {
      options = { title: 'New Operation' }
    }
    options.closeInsteadOfBack = true
    return options
  }, [operation.operatorCall, operation.stationCall, operation.subtitle, operation.title, operation.userTitle])

  const dimensions = useWindowDimensions()

  const [panesState, , updatePanesState] = useUIState('OperationScreen', 'panes', {
    mainPaneWidth: dimensions?.width * 0.8,
    resizingActive: false,
    mainPaneDelta: 0
  })

  const splitView = useMemo(() => {
    return !settings.dontSplitViews && (dimensions.width / styles.oneSpace > 95)
  }, [dimensions?.width, styles?.oneSpace, settings?.dontSplitViews])

  const mainPaneWidth = useMemo(() => {
    if (isNaN(panesState.mainPaneWidth) || !panesState.mainPaneWidth) {
      return (dimensions.width - styles.oneSpace * MIN_WIDTH_LEFT) + (panesState.mainPaneDelta || 0)
    } else {
      return Math.max(
        Math.min(
          panesState.mainPaneWidth + (panesState.mainPaneDelta || 0),
          dimensions.width - styles.oneSpace * MIN_WIDTH_RIGHT
        ),
        styles.oneSpace * MIN_WIDTH_LEFT
      )
    }
  }, [dimensions.width, panesState, styles.oneSpace])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event, gestureState) => true,
      onStartShouldSetPanResponderCapture: (event, gestureState) => true,
      onMoveShouldSetPanResponder: (event, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (event, gestureState) => true,
      onMoveShouldSetResponderCapture: (event, gestureState) => true,

      onPanResponderGrant: (event, gestureState) => {
        updatePanesState({ resizingActive: true })
      },

      onPanResponderMove: (event, gestureState) => {
        updatePanesState({ mainPaneDelta: gestureState.dx })
      },

      onPanResponderRelease: (event, gestureState) => {
        updatePanesState({ resizingActive: false })
      }
    })
  ).current

  useEffect(() => {
    if (panesState.resizingActive === false && panesState.mainPaneDelta !== 0) {
      updatePanesState({ mainPaneWidth, mainPaneDelta: 0 })
    }
  }, [panesState.resizingActive, panesState.mainPaneDelta, mainPaneWidth, updatePanesState])

  if (splitView) {
    return (
      <>
        {settings.keepDeviceAwake && <KeepAwake />}
        <ScreenContainer>
          <View style={{ height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
            <Animated.View
              style={{
                width: mainPaneWidth,
                minWidth: styles.oneSpace * MIN_WIDTH_LEFT,
                height: '100%'
              }}
            >
              <HeaderBar options={headerOptions} navigation={navigation} back={true} />
              <OpLoggingTab navigation={navigation} route={{ params: { operation, qso: suggestedQSO, splitView } }} />
            </Animated.View>
            <View
              style={{
                backgroundColor: panesState.resizingActive ? styles.colors.primaryLighter : styles.colors.primary,
                width: styles.oneSpace * 2,
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
              {...panResponder.panHandlers}
            >
              <View style={{ marginLeft: styles.oneSpace * -0.7, opacity: 0.8 }}>

                <Icon source="dots-vertical" color={styles.colors.onPrimary} size={styles.oneSpace * 3.5} />
              </View>
            </View>
            <Animated.View
              style={{
                backgroundColor: styles.colors.primary,
                flex: 1,
                minWidth: styles.oneSpace * MIN_WIDTH_RIGHT,
                height: '100%'
              }}
            >
              <SafeAreaView edges={['top']}
                style={{
                  height: '100%',
                  width: '100%',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'stretch'
                }}
              >

                <Tab.Navigator
                  id={'OperationScreen_TabNavigator'}
                  initialLayout={{ width: (dimensions.width - mainPaneWidth), height: dimensions.height }}
                  initialRouteName={ operation?.qsoCount > 0 ? 'OpInfo' : 'OpSettings' }
                  screenOptions={{
                    tabBarItemStyle: [{ width: (dimensions.width - mainPaneWidth) / 4 }, styles.screenTabBarItem, { minHeight: styles.oneSpace * 6, padding: 0 }], // This allows tab titles to be rendered while the screen is transitioning in
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
                    initialParams={{ uuid: operation.uuid, operation, splitView }}
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
            </Animated.View>

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
              initialLayout={{ width: dimensions.width, height: dimensions.height }}
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

export function buildTitleForOperation (operation) {
  if (operation?.stationCall) {
    let call = operation?.stationCall
    if (operation.operatorCall && operation.operatorCall !== operation.stationCall) {
      call = `${call} (op ${operation.operatorCall})`
    }
    let title = [operation.title, operation.userTitle].filter(x => x).join(' - ')
    title = title || 'General Operation'

    return [call ? slashZeros(call) : '', title].join(' ')
  } else {
    return 'New Operation'
  }
}
