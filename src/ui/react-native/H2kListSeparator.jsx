// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useMemo } from 'react'
import { View } from 'react-native'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function H2kListSeparator ({ style }) {
  const styles = useThemedStyles()
  const actualStyle = useMemo(() => {
    return [
      style,
      { backgroundColor: styles.colors.primary, height: styles.oneSpace * 0.7, borderTopWidth: 1, borderBottomWidth: 1, borderColor: styles.colors.primaryContainer }
    ]
  }, [style, styles])

  return <View style={actualStyle} />
}
