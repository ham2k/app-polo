/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, ImageBackground, Pressable, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { SafeAreaView, useSafeAreaFrame } from 'react-native-safe-area-context'
import SplashScreen from 'react-native-splash-screen'
import { useTranslation } from 'react-i18next'

import { enableStartupInterruptionDialogForDistribution, StartupInterruptionDialogForDistribution } from '../../distro'

import { selectRuntimeMessages } from '../../store/runtime'
import { earlyStartupSequence, startupSequence } from '../../store/runtime/actions/startupSequence'
import { selectSystemFlag, setSystemFlag } from '../../store/system'
import { selectSettings } from '../../store/settings'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { OnboardingManager } from './onboarding/OnboardingManager'
import { H2kMarkdown } from '../../ui'
import { translatedVersionName } from '../../tools/i18nUtils'

import releaseNotes from '../../../RELEASE-NOTES.json'
import packageJson from '../../../package.json'

const SPLASH_IMAGE = require('./img/launch_screen.jpg')
const HAM2K_LOGO = require('./img/ham2k-3000-filled.png')

export default function StartScreen ({ setAppState }) {
  const { t } = useTranslation()
  const { height } = useSafeAreaFrame()
  // const { height } = useWindowDimensions() <-- broken on iOS, no rotation

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
          <Pressable style={[styles.titleBoxTop, { backgroundColor: 'transparent' }]} onPress={() => { handleInterruption(); return true }} android_ripple={false}>
            <Image source={HAM2K_LOGO} style={{ height: 60, width: 500, alignSelf: 'center', backgroundColor: 'transparent' }} resizeMode="contain" />
          </Pressable>
          <Pressable style={styles.titleBoxBottom} onPress={() => { handleInterruption(); return true }} >
            <Text style={styles.polo}>Portable Logger</Text>
            <Text style={styles.credits}>{t('screens.start.credits', 'by KI2D and friends')}</Text>
            <Text style={styles.version}>{translatedVersionName({ t, version: packageJson.version }).full}</Text>
          </Pressable>
          <View style={styles.messagesBox}>
            {messages.map((msg, i) => (
              <H2kMarkdown key={i} styles={styles}>{msg.message}</H2kMarkdown>
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

function prepareStyles (baseTheme, height, dialogVisible) {
  const characterizeTopHalf = 'dark' // 'light', 'mediumLight', 'medium', 'mediumDark', 'dark'
  const characterizeBottomHalf = 'dark' // 'light', 'mediumLight', 'medium', 'mediumDark', 'dark'

  const topTextColor = { light: '#000', mediumLight: '#000', medium: '#FFF', mediumDark: '#FFF', dark: '#FFF' }[characterizeTopHalf]
  const topHaloColor = { light: '#FFF', mediumLight: '#FFF', medium: '#000', mediumDark: '#000', dark: '#000' }[characterizeTopHalf]
  const topBackColor = { light: 'rgba(0,0,0,0.3)', mediumLight: 'rgba(0,0,0,0.3)', medium: 'transparent', mediumDark: 'transparent', dark: 'transparent' }[characterizeTopHalf]
  const bottomTextColor = { light: '#000', mediumLight: '#000', medium: '#FFF', mediumDark: '#FFF', dark: '#FFF' }[characterizeBottomHalf]
  const bottomHaloColor = { light: '#FFF', mediumLight: '#FFF', medium: '#000', mediumDark: '#000', dark: '#000' }[characterizeBottomHalf]
  const bottomBackColor = { light: 'rgba(255,255,255,0.3)', mediumLight: 'rgba(0,0,0,0.3)', medium: 'transparent', mediumDark: 'transparent', dark: 'transparent' }[characterizeBottomHalf]

  return {
    ...baseTheme,
    root: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'stretch',
      resizeMode: 'cover',
      resizeMethod: 'resize',
      position: 'absolute',
      width: '100%',
      height: '100%'
    },
    container: {
      height: '100%',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'space-between'
    },
    titleBoxSpacer: {
      height: dialogVisible ? '10%' : '10%'
    },
    titleBoxTop: {
      // justifyContent: 'flex-end',
      backgroundColor: topBackColor
    },
    titleBoxBottom: {
      // marginTop: height * 0.15
      justifyContent: 'flex-start',
      marginBottom: baseTheme.oneSpace * 2,
      backgroundColor: bottomBackColor,
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
    credits: {
      fontSize: baseTheme.normalFontSize * 1.1,
      lineHeight: baseTheme.normalFontSize * 2,
      fontWeight: 400,
      textShadowColor: topHaloColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace * 1, // 1.5,
      fontFamily: 'Roboto Slab',
      color: topTextColor,
      textAlign: 'center',
      paddingBottom: baseTheme.oneSpace
    },
    version: {
      fontSize: baseTheme.normalFontSize * 1.3,
      lineHeight: baseTheme.normalFontSize * 2,
      fontWeight: 400,
      textShadowColor: topHaloColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace * 1,
      color: topTextColor,
      textAlign: 'center',
      paddingTop: baseTheme.oneSpace
    },
    message: {
      textShadowColor: bottomHaloColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace,
      fontSize: baseTheme.normalFontSize * 1.25,
      fontWeight: 'bold',
      color: bottomTextColor,
      textAlign: 'center'
    },
    caption: {
      color: bottomTextColor,
      textShadowColor: bottomHaloColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: baseTheme.oneSpace,
      fontSize: baseTheme.normalFontSize * 1.125,
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
