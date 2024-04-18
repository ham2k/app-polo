/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { List } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function Ham2kListSection ({ title, children, ...moreProps }) {
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
