/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { View } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export const ListSeparator = ({ style }) => {
  const styles = useThemedStyles()

  return <View style={[style, { backgroundColor: styles.colors.primary, height: styles.oneSpace * 0.7, borderTopWidth: 1, borderBottomWidth: 1, borderColor: styles.colors.primaryContainer }]} />
}

export const ListRow = ({ style, children }) => {
  const styles = useThemedStyles()

  return <View style={[style, { paddingLeft: styles.oneSpace * 1.5, paddingRight: styles.oneSpace * 2, minHeight: styles.oneSpace * 3 }]}>{children}</View>
}
