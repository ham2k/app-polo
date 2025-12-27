/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useState } from 'react'

import { Keyboard, Platform, View } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function prepareStyles (baseStyles) {
  return ({
    ...baseStyles,
    root: {
      backgroundColor: baseStyles.colors.background,
      flex: 1,
      height: '100%',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'stretch'
    }
  })
}

export default function ScreenContainer ({ children }) {
  const styles = useThemedStyles(prepareStyles)
  const safeAreaInsets = useSafeAreaInsets()

  const [keyboardVisible, setKeyboardVisible] = useState()
  const [keyboardHeight, setKeyboardHeight] = useState()

  useEffect(() => {
    const didShowSubscription = Keyboard.addListener('keyboardDidShow', () => {
      const metrics = Keyboard.metrics()
      setKeyboardVisible(true)
      if (Platform.OS === 'android') {
        setKeyboardHeight((metrics?.height ?? 0) + safeAreaInsets.bottom)
      } else {
        setKeyboardHeight(metrics?.height ?? 0)
      }
      if (metrics.height > 100) {
        // On iPads, when there's an external keyboard connected, the OS still shows a small
        // button on the bottom right with some options
        // This is considered "keyboard visible", which causes KeyboardAvoidingView to leave an ugly empty padding
        setKeyboardVisible(true)
      } else {
        setKeyboardVisible(false)
      }
    })
    const willHideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      const metrics = Keyboard.metrics()

      setKeyboardVisible(false)
      setKeyboardHeight(metrics?.height ?? 0)
    })
    const didHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      const metrics = Keyboard.metrics()

      setKeyboardVisible(false)
      setKeyboardHeight(metrics?.height ?? 0)
    })
    const frameSubscription = Keyboard.addListener('keyboardDidChangeFrame', () => {
      const metrics = Keyboard.metrics()

      setKeyboardHeight(metrics?.height ?? 0)
    })

    return () => {
      didShowSubscription.remove()
      willHideSubscription.remove()
      didHideSubscription.remove()
      frameSubscription.remove()
    }
  }, [safeAreaInsets])

  if (keyboardVisible) {
    return (
      <View style={[styles.root, { paddingBottom: keyboardHeight ?? 0 }]}>
        {children}
      </View>
    )
  } else {
    return (
      <View style={styles.root}>
        {children}
      </View>
    )
  }

  // There is a bug in react-native-keyboard-controller with Reanimated 4.0
  // where the padding is not removed after the keyboard is shown, so we implemented our own version

  // return (
  //   <KeyboardAvoidingView
  //     style={styles.root}
  //     behavior={'padding'}
  //     // keyboardVerticalOffset={headerHeight}
  //     enabled={keyboardVisible}
  //   >
  //     {children}
  //   </KeyboardAvoidingView>
  // )
}
