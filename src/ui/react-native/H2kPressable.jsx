/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { Platform, Pressable } from 'react-native'

import { TouchableRipple } from 'react-native-paper'

export function H2kPressable ({ style, rippleColor, underlayColor, children, ...props }) {
  const actualUnderlayColor = useMemo(() => {
    return underlayColor ?? rippleColor ?? 'rgba(0, 0, 0, 0.1)'
  }, [underlayColor, rippleColor])

  if (Platform.OS === 'android') {
    // On Android, it seems that Paper's TouchableRipple does not work well
    // because the regular RN Pressable is broken (see https://github.com/facebook/react-native/issues/52939)
    // so for now we'll roll our own behavior.
    return (
      <Pressable
        {...props}
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
        rippleColor={rippleColor}
        underlayColor={underlayColor}
        style={style}
      >
        {children}
      </TouchableRipple>
    )
  }
}
