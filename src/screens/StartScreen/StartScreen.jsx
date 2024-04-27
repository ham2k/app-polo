/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { ImageBackground, View, useWindowDimensions } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import SplashScreen from 'react-native-splash-screen'

import { selectRuntimeMessages } from '../../store/runtime'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Ham2kMarkdown } from '../components/Ham2kMarkdown'
import { startupSequence } from '../../store/runtime/actions/startupSequence'
import { OnboardingManager } from './onboarding/OnboardingManager'
import { selectSettings } from '../../store/settings'
import { selectSystemFlag, setSystemFlag } from '../../store/system'

const SPLASH_IMAGE = require('./img/launch_screen.png')

function prepareStyles (baseTheme, height) {
  return {
    ...baseTheme,
    root: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'stretch',
      resizeMode: 'cover',
      height: '100%'
    },
    container: {
      height: '100%',
      flexDirection: 'column',
      justifyContent: 'space-between'
    },
    titleBox: {
      marginTop: height * 0.15
    },
    messagesBox: {
      marginBottom: height * 0.05,
      minHeight: baseTheme.oneSpace * 20,
      justifyContent: 'flex-end',
      alignItems: 'center'
    },
    ham2k: {
      fontSize: baseTheme.normalFontSize * 1.7,
      lineHeight: baseTheme.normalFontSize * 2,
      fontWeight: 400,
      textShadowColor: '#000',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace * 1.5,
      color: '#FFF',
      textAlign: 'center'
    },
    polo: {
      fontSize: baseTheme.normalFontSize * 2.3,
      lineHeight: baseTheme.normalFontSize * 3,
      textShadowColor: '#000',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace * 2,
      fontFamily: 'Roboto Slab Black',
      color: '#FFF',
      textAlign: 'center'
    },
    message: {
      textShadowColor: '#000',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace,
      fontSize: 20,
      fontWeight: 'bold',
      color: '#D0D0D0',
      textAlign: 'center'
    },
    markdown: {
      ...baseTheme.markdown,
      body: {
        ...baseTheme.markdown.body,
        color: '#D0D0D0',
        fontSize: baseTheme.normalFontSize,
        textAlign: 'center',
        marginLeft: baseTheme.oneSpace * 3,
        marginRight: baseTheme.oneSpace * 3
      },
      paragraph: {
        textShadowColor: '#000',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: baseTheme.oneSpace,
        textAlign: 'center',
        alignItems: 'center',
        margin: 0,
        marginBottom: 0,
        marginTop: baseTheme.halfSpace,
        padding: 0
      }
    }
  }
}

export default function StartScreen ({ setAppState }) {
  const { height } = useWindowDimensions()

  const styles = useThemedStyles(prepareStyles, height)

  const settings = useSelector(selectSettings)
  const onboardedOn = useSelector((state) => selectSystemFlag(state, 'onboardedOn'))

  const dispatch = useDispatch()
  const messages = useSelector(selectRuntimeMessages)

  useEffect(() => {
    SplashScreen.hide()
  }, [])

  const [startupPhase, setStartupPhase] = useState('hold')

  useEffect(() => { // Determine the startup phase
    if (startupPhase !== 'hold') return
    if (!onboardedOn || !settings?.operatorCall) {
      setTimeout(() => setStartupPhase('onboarding'), 1000) // Let the splash screen show for a moment
    } else {
      setStartupPhase('start')
    }
  }, [startupPhase, onboardedOn, settings?.operatorCall])

  const handleOnboardingDone = useCallback(() => {
    dispatch(setSystemFlag('onboardedOn', Date.now()))
    setStartupPhase('start')
  }, [dispatch, setStartupPhase])

  useEffect(() => { // Once ready, begin the startup sequence
    if (startupPhase === 'start') {
      setStartupPhase('starting')
      dispatch(startupSequence(() => setAppState('ready')))
    }
  }, [dispatch, setAppState, startupPhase])

  return (
    <ImageBackground source={SPLASH_IMAGE} style={styles.root}>
      <SafeAreaView>
        <GestureHandlerRootView style={styles.container}>
          <View style={styles.titleBox}>
            <Text style={styles.ham2k}>Ham2K</Text>
            <Text style={styles.polo}>Portable Logger</Text>
          </View>
          <View style={styles.messagesBox}>
            {messages.map((msg, i) => (
              <Ham2kMarkdown key={i} styles={styles}>{msg.message}</Ham2kMarkdown>
            ))}
          </View>
        </GestureHandlerRootView>
      </SafeAreaView>
      {startupPhase === 'onboarding' && (
        <OnboardingManager
          settings={settings}
          styles={styles}
          onOnboardingDone={handleOnboardingDone}
        />
      )}
    </ImageBackground>
  )
}
