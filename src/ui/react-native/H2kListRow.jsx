// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useMemo } from 'react'
import { View } from 'react-native'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function H2kListRow ({ style, children }) {
  const styles = useThemedStyles()
  const actualStyle = useMemo(() => {
    return [
      style,
      {
        paddingLeft: styles.oneSpace * 1.5,
        paddingRight: styles.oneSpace * 2,
        minHeight: styles.oneSpace * 3
      }
    ]
  }, [style, styles])

  return (
    <View style={actualStyle}>
      {children}
    </View>
  )
}
