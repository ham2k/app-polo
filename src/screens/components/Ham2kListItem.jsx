/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { List } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function Ham2kListItem ({ title, description, disabled, ...moreProps }) {
  const styles = useThemedStyles()

  const titleStyle = useMemo(() => {
    return {
      ...styles.list.title,
      ...moreProps.titleStyle
    }
  }, [moreProps.titleStyle, styles])

  const descriptionStyle = useMemo(() => {
    return {
      ...styles.list.description,
      ...moreProps.descriptionStyle
    }
  }, [moreProps.descriptionStyle, styles])

  return (
    <List.Item
      {...moreProps}
      title={title}
      style={disabled ? { opacity: 0.5 } : {}}
      description={description}
      titleStyle={titleStyle}
      descriptionStyle={descriptionStyle}
    />
  )
}
