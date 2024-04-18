/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { List } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function Ham2kListSubheader ({ title, children, ...moreProps }) {
  const styles = useThemedStyles()

  const titleStyle = useMemo(() => {
    return {
      ...styles.list.section,
      ...moreProps.titleStyle
    }
  }, [moreProps.titleStyle, styles])

  const style = useMemo(() => {
    return {
      ...styles.list.section,
      ...moreProps.style
    }
  }, [moreProps.style, styles])

  return (
    <List.Subheader
      {...moreProps}
      title={title}
      titleStyle={titleStyle}
      style={style}
    >
      {children}
    </List.Subheader>
  )
}
