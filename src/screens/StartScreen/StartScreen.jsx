import React, { useEffect } from 'react'
import { ImageBackground, View, useWindowDimensions } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import SplashScreen from 'react-native-splash-screen'

import { loadAllDataFiles } from '../../store/dataFiles/actions/dataFileFS'
import { setupOnlineStatusMonitoring } from '../../store/runtime/actions/onlineStatus'
import { addRuntimeMessage, resetRuntimeMessages, selectRuntimeMessages } from '../../store/runtime'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Ham2kMarkdown } from '../components/Ham2kMarkdown'
import { startupSequence } from '../../store/runtime/actions/startupSequence'

const SPLASH_IMAGE = require('./img/launch_screen.png')

export default function StartScreen ({ setAppState }) {
  const { height } = useWindowDimensions()

  const styles = useThemedStyles((baseTheme) => {
    const dropShadow = {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: baseTheme.oneSpace * 0.5
    }
    return {
      screen: {
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
        ...dropShadow,
        fontSize: 30,
        fontWeight: 400,
        color: '#F0F0F0',
        textAlign: 'center'
      },
      polo: {
        ...dropShadow,
        fontSize: 40,
        fontWeight: 'bold',
        color: '#D0D0D0',
        textAlign: 'center'
      },
      message: {
        ...dropShadow,
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
          ...dropShadow,
          textAlign: 'center',
          alignItems: 'center',
          margin: 0,
          marginBottom: 0,
          marginTop: baseTheme.halfSpace,
          padding: 0
        }
      }
    }
  })

  const dispatch = useDispatch()
  const messages = useSelector(selectRuntimeMessages)

  useEffect(() => {
    SplashScreen.hide()
    dispatch(startupSequence(() => setAppState('ready')))
  }, [dispatch, setAppState])

  return (
    <ImageBackground source={SPLASH_IMAGE} style={styles.screen}>
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
    </ImageBackground>
  )
}
