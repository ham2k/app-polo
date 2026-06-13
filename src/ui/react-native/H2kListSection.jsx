// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useMemo } from 'react'
import { List } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function H2kListSection ({ title, children, ...moreProps }) {
  const styles = useThemedStyles()

  const titleStyle = useMemo(() => {
    return {
      ...styles.list.section,
      ...moreProps.titleStyle
    }
  }, [moreProps.titleStyle, styles])

  return (
    <List.Section
      {...moreProps}
      title={title}
      titleStyle={titleStyle}
    >
      {children}
    </List.Section>
  )
}
