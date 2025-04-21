/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Animated, PanResponder, Platform, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import KeepAwake from '@sayem314/react-native-keep-awake'

import { loadOperation, selectOperation } from '../../store/operations'
import { loadQSOs, lookupAllQSOs, confirmFromSpots } from '../../store/qsos'
import { selectSettings, setSettings } from '../../store/settings'
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
import { Icon, Menu, Text } from 'react-native-paper'
import { slashZeros } from '../../tools/stringTools'
import { hasRef } from '../../tools/refTools'
import { parseCallsign } from '@ham2k/lib-callsigns'

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
        title: buildTitleForOperation({ operatorCall: operation.local?.operatorCall, stationCall: operation?.stationCallPlus || operation.stationCall, title: operation.title, userTitle: operation.userTitle }),
        subTitle: operation.subtitle
      }
    } else {
      options = { title: 'New Operation' }
    }
    options.closeInsteadOfBack = true
    options.rightMenuItems = <OperationMenuItems {...{ operation, settings, styles, dispatch, online }} />

    return options
  }, [dispatch, online, operation, settings, styles])

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
              <HeaderBar options={headerOptions} navigation={navigation} back={true} rightAction={'cog'} />
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
              accesibilityLabel={'Pane Separator'}
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
                    freezeOnBlur: true,
                    lazy: true
                  }}
                >
                  <Tab.Screen
                    name="OpInfo"
                    options={{ title: 'Info', tabBarAccessibilityLabel: 'Info Tab' }}
                    accessibilityLabel="Operation Info"
                    component={OpInfoTab}
                    initialParams={{ uuid: operation.uuid, operation, splitView }}
                  />

                  <Tab.Screen
                    name="OpSpots"
                    options={{ title: 'Spots', tabBarAccessibilityLabel: 'Spots Tab' }}
                    component={OpSpotsTab}
                    initialParams={{ uuid: operation.uuid, operation, splitView }}
                    screenOptions={{ lazy: true }}
                  />

                  <Tab.Screen
                    name="OpMap"
                    options={{ title: 'Map', tabBarAccessibilityLabel: 'Map Tab' }}
                    component={OpMapTab}
                    initialParams={{ uuid: operation.uuid, operation, splitView }}
                    screenOptions={{ lazy: true }}
                    splitView={splitView}
                  />

                  <Tab.Screen
                    name="OpSettings"
                    options={{
                      title: (dimensions.width / 4) > (styles.oneSpace * 34) ? 'Operation' : 'Oper.',
                      tabBarAccessibilityLabel: 'Operation Settings Tab'
                    }}
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
                freezeOnBlur: true,
                lazy: true
              }}
            >
              <Tab.Screen
                name="OpLog"
                options={{ title: 'QSOs', tabBarAccessibilityLabel: 'Q sos Tab' }}
                component={OpLoggingTab}
                initialParams={{ uuid: operation.uuid, operation }}
              />

              <Tab.Screen
                name="OpSpots"
                options={{ title: 'Spots', tabBarAccessibilityLabel: 'Spots Tab' }}
                component={OpSpotsTab}
                initialParams={{ uuid: operation.uuid, operation }}
                screenOptions={ { lazy: true }}
              />

              <Tab.Screen
                name="OpMap"
                options={{ title: 'Map', tabBarAccessibilityLabel: 'Map Tab' }}
                component={OpMapTab}
                initialParams={{ uuid: operation.uuid, operation }}
                screenOptions={ { lazy: true }}
              />

              <Tab.Screen
                name="OpSettings"
                options={{
                  title: (dimensions.width / 4) > (styles.oneSpace * 10.5) ? 'Operation' : 'Oper.',
                  tabBarAccessibilityLabel: 'Operation Settings Tab'
                }}
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

export function buildTitleForOperation (operationAttrs, { includeCall = true } = {}) {
  if (operationAttrs.stationCall) {
    let call = operationAttrs.stationCall
    if (operationAttrs.operatorCall && operationAttrs.operatorCall !== operationAttrs.stationCall) {
      const stationCallInfo = parseCallsign(operationAttrs.stationCall)
      const operatorCallInfo = parseCallsign(operationAttrs.operatorCall)
      if (stationCallInfo?.baseCall !== operatorCallInfo?.baseCall) {
        call = `${call} (op ${operationAttrs.operatorCall})`
      }
    }
    const parts = []
    if (operationAttrs.userTitle) {
      parts.push(operationAttrs.userTitle)
    }
    if (operationAttrs.title && operationAttrs.title !== 'New Operation') {
      parts.push(operationAttrs.title)
    }
    let title = parts.join(' ')
    title = title || 'General Operation'

    if (includeCall) {
      return [call ? slashZeros(call) : '', title].join(' ')
    } else {
      return title
    }
  } else {
    return 'New Operation'
  }
}

function OperationMenuItems ({ operation, settings, styles, dispatch, online, setShowMenu }) {
  const hideAndRun = useCallback((action) => {
    setShowMenu(false)
    setTimeout(() => action(), 10)
  }, [setShowMenu])

  return (
    <>
      <Text style={{ marginHorizontal: styles.oneSpace * 2, marginVertical: styles.oneSpace * 1, ...styles.text.bold }}>
        Logging Settings
      </Text>
      <Menu.Item
        leadingIcon="signal"
        trailingIcon={settings.showRSTFields === false ? 'circle-outline' : 'check-circle-outline'}
        onPress={() => { hideAndRun(() => dispatch(setSettings({ showRSTFields: settings.showRSTFields === false }))) }}
        title={'RST Fields'}
        contentStyle={{ minWidth: styles.oneSpace * 20 }}
      />
      <Menu.Item
        leadingIcon="select-marker"
        trailingIcon={settings.showStateField === false ? 'circle-outline' : 'check-circle-outline'}
        onPress={() => { hideAndRun(() => dispatch(setSettings({ showStateField: settings.showStateField === false }))) }}
        title={'State Field'}
        contentStyle={{ minWidth: styles.oneSpace * 20 }}
      />
      <Menu.Item
        leadingIcon="delete-off-outline"
        trailingIcon={settings.showDeletedQSOs === false ? 'circle-outline' : 'check-circle-outline'}
        onPress={() => { hideAndRun(() => dispatch(setSettings({ showDeletedQSOs: settings.showDeletedQSOs === false }))) }}
        title={'Show Deleted QSOs'}
        contentStyle={{ minWidth: styles.oneSpace * 20 }}
      />
      <Menu.Item
        leadingIcon="numeric"
        trailingIcon={settings.showNumbersRow === false ? 'circle-outline' : 'check-circle-outline'}
        onPress={() => { hideAndRun(() => dispatch(setSettings({ showNumbersRow: settings.showNumbersRow === false }))) }}
        title={'Numbers Row'}
        contentStyle={{ minWidth: styles.oneSpace * 20 }}
      />
      <View style={{ height: 2, backgroundColor: styles.colors.onSurface, marginHorizontal: styles.oneSpace * 2, marginTop: styles.oneSpace }} />
      <Text style={{ marginHorizontal: styles.oneSpace * 2, marginVertical: styles.oneSpace * 1, ...styles.text.bold }}>
        Actions
      </Text>
      <Menu.Item
        leadingIcon="search-web"
        onPress={() => hideAndRun(() => dispatch(lookupAllQSOs(operation.uuid)))}
        title={'Lookup all QSOs'}
        contentStyle={{ minWidth: styles.oneSpace * 20 }}
      />
      {hasRef(operation, 'potaActivation') &&
        <Menu.Item
          leadingIcon="list-status"
          onPress={() => hideAndRun(() => {
            return dispatch(confirmFromSpots({ operation }))
          })}
          title={'Confirm Spots'}
          contentStyle={{ minWidth: styles.oneSpace * 20 }}
        />}
    </>
  )
}
