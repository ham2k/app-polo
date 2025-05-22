/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ImageBackground, Pressable, View, useWindowDimensions } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { SafeAreaView } from 'react-native-safe-area-context'
import SplashScreen from 'react-native-splash-screen'

import { selectRuntimeMessages } from '../../store/runtime'
import { Ham2kMarkdown } from '../components/Ham2kMarkdown'
import { earlyStartupSequence, startupSequence } from '../../store/runtime/actions/startupSequence'
import { selectSystemFlag, setSystemFlag } from '../../store/system'
import { selectSettings } from '../../store/settings'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { OnboardingManager } from './onboarding/OnboardingManager'

import { enableStartupInterruptionDialogForDistribution, StartupInterruptionDialogForDistribution } from '../../distro'

import releaseNotes from '../../../RELEASE-NOTES.json'
import packageJson from '../../../package.json'

const SPLASH_IMAGE = require('./img/launch_screen.jpg')

function prepareStyles (baseTheme, height, dialogVisible) {
  const characterizeTopHalf = 'light' // 'light', 'mediumLight', 'medium', 'mediumDark', 'dark'
  const characterizeBottomHalf = 'mediumDark' // 'light', 'mediumLight', 'medium', 'mediumDark', 'dark'

  const topTextColor = { light: '#000', mediumLight: '#000', medium: '#FFF', mediumDark: '#FFF', dark: '#FFF' }[characterizeTopHalf]
  const topHaloColor = { light: '#FFF', mediumLight: '#FFF', medium: '#000', mediumDark: '#000', dark: '#000' }[characterizeTopHalf]
  const topBackColor = { light: 'rgba(0,0,0,0)', mediumLight: 'rgba(0,0,0,.3)', medium: 'rgba(0,0,0,.15)', mediumDark: 'rgba(255,255,255,.1)', dark: 'rgba(255,255,255,.0)' }[characterizeTopHalf]
  const bottomTextColor = { light: '#000', mediumLight: '#000', medium: '#FFF', mediumDark: '#FFF', dark: '#FFF' }[characterizeBottomHalf]
  const bottomHaloColor = { light: '#FFF', mediumLight: '#FFF', medium: '#000', mediumDark: '#000', dark: '#000' }[characterizeBottomHalf]
  const bottomBackColor = { light: 'rgba(0,0,0,0)', mediumLight: 'rgba(0,0,0,.3)', medium: 'rgba(0,0,0,.15)', mediumDark: 'rgba(255,255,255,0)', dark: 'rgba(255,255,255,.0)' }[characterizeBottomHalf]

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
    titleBoxSpacer: {
      height: dialogVisible ? '10%' : '10%'
    },
    titleBoxTop: {
      backgroundColor: topBackColor,
      justifyContent: 'flex-end'
    },
    titleBoxBottom: {
      // marginTop: height * 0.15
      justifyContent: 'flex-start',
      marginBottom: baseTheme.oneSpace * 2,
      backgroundColor: topBackColor,
      flex: 0
    },
    messagesBox: {
      marginBottom: height * 0.05,
      flex: 1,
      // minHeight: baseTheme.oneSpace * 20,
      justifyContent: 'flex-end',
      alignItems: 'center',
      overflow: 'hidden'
    },
    captionBox: {
      justifyContent: 'flex-end',
      alignItems: 'center',
      backgroundColor: bottomBackColor
    },
    ham2k: {
      fontSize: baseTheme.normalFontSize * 1.7,
      lineHeight: baseTheme.normalFontSize * 2,
      fontWeight: 400,
      textShadowColor: topHaloColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace * 1, // 1.5,
      color: topTextColor,
      textAlign: 'center'
    },
    polo: {
      fontSize: baseTheme.normalFontSize * 2.3,
      lineHeight: baseTheme.normalFontSize * 3,
      textShadowColor: topHaloColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace * 2,
      fontFamily: 'Roboto Slab Black',
      color: topTextColor,
      textAlign: 'center'
    },
    version: {
      fontSize: baseTheme.normalFontSize * 1.3,
      lineHeight: baseTheme.normalFontSize * 2,
      fontWeight: 400,
      textShadowColor: topHaloColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace * 2,
      color: topTextColor,
      textAlign: 'center',
      paddingTop: baseTheme.oneSpace
    },
    message: {
      textShadowColor: bottomHaloColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace,
      fontSize: 20,
      fontWeight: 'bold',
      color: bottomTextColor,
      textAlign: 'center'
    },
    caption: {
      color: bottomTextColor,
      textShadowColor: bottomHaloColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace,
      fontSize: 18,
      fontWeight: 'normal',
      textAlign: 'center',
      padding: baseTheme.oneSpace
    },
    markdown: {
      ...baseTheme.markdown,
      body: {
        ...baseTheme.markdown.body,
        color: bottomTextColor,
        fontSize: baseTheme.normalFontSize * 1.2,
        textAlign: 'center',
        marginLeft: baseTheme.oneSpace * 3,
        marginRight: baseTheme.oneSpace * 3
      },
      paragraph: {
        backgroundColor: bottomBackColor,
        paddingHorizontal: baseTheme.oneSpace * 0.5,
        textShadowColor: bottomHaloColor,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: baseTheme.oneSpace * 1,
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

  const settings = useSelector(selectSettings)
  const onboardedOn = useSelector((state) => selectSystemFlag(state, 'onboardedOn'))
  const dispatch = useDispatch()
  const messages = useSelector(selectRuntimeMessages)

  const photoCaption = useMemo(() => {
    const version = Object.keys(releaseNotes).find((v) => releaseNotes[v].photoCaption)
    return releaseNotes[version].photoCaption
  }, [])

  useEffect(() => {
    SplashScreen.hide()
  }, [])

  const versionName = packageJson.versionName ? `${packageJson.versionName} Release` : `Version ${packageJson.version}`

  const [startupPhase, setStartupPhase] = useState(undefined)

  const styles = useThemedStyles(prepareStyles, height, startupPhase === 'onboarding')

  useEffect(() => { // Determine actions based on the startup phase
    /*
     * Statup phases are:
     *  - undefined
     *  - 'earlyStart' : Perform early startup and then proceed to 'hold'
     *  - 'hold'       : Hold for a sec and continue to either 'onboarding' or 'start'
     *  - 'onboarding' : Show onboarding dialogs until ready
     *  - 'start'      : Trigger startup sequence, which will start the main app when ready
     *  - 'starting'   : startup sequence is in process
     */
    if (startupPhase === undefined) {
      // Load early extensions and such
      setStartupPhase('earlyStart')
      dispatch(earlyStartupSequence(() => { setStartupPhase('hold') }))
    } else if (startupPhase === 'hold') {
      // Hold for a second and decide if we need to show onboarding or not
      if (!onboardedOn || !settings?.operatorCall) {
        setTimeout(() => setStartupPhase('onboarding'), 1000) // Let the splash screen show for a moment
      } else {
        // If startup interruption is enabled, give the user some milliseconds to trigger it
        if (enableStartupInterruptionDialogForDistribution({ settings })) {
          const timeout = setTimeout(() => {
            if (startupPhase === 'hold') {
              setStartupPhase('start')
            }
          }, 500)
          return () => clearTimeout(timeout)
        } else {
          setStartupPhase('start')
        }
      }
    } else if (startupPhase === 'start') {
      // Once ready, begin the startup sequence
      setStartupPhase('starting')
      dispatch(startupSequence(() => setAppState('ready')))
    }
  }, [startupPhase, onboardedOn, settings, dispatch, setAppState])

  const handleOnboardingDone = useCallback(() => {
    dispatch(setSystemFlag('onboardedOn', Date.now()))
    setStartupPhase('start')
  }, [dispatch, setStartupPhase])

  useEffect(() => {
  }, [dispatch, setAppState, startupPhase])

  const handleInterruption = useCallback(() => { // If the uer taps the screen, show the track selection dialog
    if (startupPhase === 'hold') setStartupPhase('dialog')
  }, [setStartupPhase, startupPhase])

  return (
    <ImageBackground source={SPLASH_IMAGE} style={styles.root}>
      <GestureHandlerRootView>
        <SafeAreaView style={styles.container}>
          <View style={styles.titleBoxSpacer} />
          <Pressable style={styles.titleBoxTop} onPress={() => { handleInterruption(); return true }}>
            <Text style={styles.ham2k}>Ham2K</Text>
          </Pressable>
          <Pressable style={styles.titleBoxBottom} onPress={() => { handleInterruption(); return true }}>
            <Text style={styles.polo} onPressIn={handleInterruption}>Portable Logger</Text>
            <Text style={styles.version}>{versionName}</Text>
          </Pressable>
          <View style={styles.messagesBox}>
            {messages.map((msg, i) => (
              <Ham2kMarkdown key={i} styles={styles}>{msg.message}</Ham2kMarkdown>
            ))}
          </View>
          <View style={styles.captionBox}>
            <Text style={styles.caption}>{photoCaption}</Text>
          </View>
        </SafeAreaView>
        {startupPhase === 'dialog' && (
          <StartupInterruptionDialogForDistribution
            settings={settings}
            styles={styles}
            setStartupPhase={setStartupPhase}
          />
        )}
        {startupPhase === 'onboarding' && (
          <OnboardingManager
            settings={settings}
            styles={styles}
            onOnboardingDone={handleOnboardingDone}
          />
        )}
      </GestureHandlerRootView>
    </ImageBackground>
  )
}
