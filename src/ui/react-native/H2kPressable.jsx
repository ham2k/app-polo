// Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useMemo } from 'react'
import { Platform, Pressable } from 'react-native'

import { TouchableRipple } from 'react-native-paper'

export function H2kPressable({ style, rippleColor, underlayColor, children, vibrate, onPressDown, ...props }) {
  const actualUnderlayColor = useMemo(() => {
    return underlayColor ?? rippleColor ?? 'rgba(0, 0, 0, 0.1)'
  }, [underlayColor, rippleColor])

  const handlePressDown = useCallback(() => {
    if (vibrate) {
      Vibration.vibrate(400)
    }
    onPressDown && onPressDown()
  }, [vibrate, onPressDown])

  if (Platform.OS === 'android') {
    // On Android, it seems that Paper's TouchableRipple does not work well
    // because the regular RN Pressable is broken (see https://github.com/facebook/react-native/issues/52939)
    // so for now we'll roll our own behavior.
    return (
      <Pressable
        {...props}
        onPressDown={handlePressDown}
        style={
          ({ pressed }) => {
            if (pressed) {
              return [{
                backgroundColor: actualUnderlayColor
              }, style]
            } else {
              return style
            }
          }
        }
      >
        {children}
      </Pressable>
    )
  } else {
    return (
      <TouchableRipple
        {...props}
        onPressDown={handlePressDown}
        rippleColor={rippleColor}
        underlayColor={underlayColor}
        style={style}
      >
        {children}
      </TouchableRipple>
    )
  }
}
