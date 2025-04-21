/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useState } from 'react'
import { useHeaderHeight } from '@react-navigation/elements'

import { KeyboardAvoidingView, Platform, View, Keyboard } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

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
  const headerHeight = useHeaderHeight()
  const styles = useThemedStyles(prepareStyles)

  const [keyboardVisible, setKeyboardVisible] = useState()

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true)
      if (Keyboard.metrics().height > 100) {
        // On iPads, when there's an external keyboard connected, the OS still shows a small
        // button on the bottom right with some options
        // This is considered "keyboard visible", which causes KeyboardAvoidingView to leave an ugly empty padding
        setKeyboardVisible(true)
      } else {
        setKeyboardVisible(false)
      }
    })
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false)
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={'padding'}
      keyboardVerticalOffset={headerHeight}
      enabled={keyboardVisible}
    >
      {children}
    </KeyboardAvoidingView>
  )
}
