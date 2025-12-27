/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Keyboard, Platform } from 'react-native'
import { useState, useEffect } from 'react'

export function useKeyboardVisible () {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  // On iPads, when there's an external keyboard connected, the OS still shows a small
  // button on the bottom right with some options
  // This is considered "keyboard visible", which causes KeyboardAvoidingView to leave an ugly empty padding
  // So we need to manually track the keyboard height and adjust the padding accordingly.
  const [keyboardExtraStyles, setKeyboardExtraStyles] = useState({})

  useEffect(() => {
    if (Keyboard.isVisible()) {
      const metrics = Keyboard.metrics()
      if (metrics.height > 100) {
        setIsKeyboardVisible(true)
        setKeyboardExtraStyles({})
      } else {
        setIsKeyboardVisible(false)
        setKeyboardExtraStyles({ paddingBottom: metrics.height - (Platform.OS === 'ios' ? 10 : 0) })
      }
    }

    const didShowSubscription = Keyboard.addListener('keyboardDidShow', () => {
      const metrics = Keyboard.metrics()
      if ((metrics?.height || 0) > 100) {
        setIsKeyboardVisible(true)
        setKeyboardExtraStyles({})
      } else {
        setIsKeyboardVisible(false)
        setKeyboardExtraStyles({ paddingBottom: (metrics?.height || 0) - (Platform.OS === 'ios' ? 10 : 0) })
      }
    })
    const didHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false)
      setKeyboardExtraStyles({})
    })
    const willHideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false)
      setKeyboardExtraStyles({})
    })

    return () => {
      didShowSubscription.remove()
      didHideSubscription.remove()
      willHideSubscription.remove()
    }
  }, [])

  return { isKeyboardVisible, keyboardExtraStyles }
}
