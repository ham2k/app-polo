/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import LoggerChip from '../../components/LoggerChip'

export default function SpotListMapToggle ({ onPress, styles, themeColor, inMapMode }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 0, flexDirection: 'column', paddingHorizontal: 0, gap: styles.oneSpace, alignItems: 'center' }}>
      <View style={{ flex: 0, flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace, alignItems: 'center' }}>
        <LoggerChip
          style={{ flex: 0 }} styles={styles} themeColor={themeColor}
          selected={false}
          icon={inMapMode ? 'view-list' : 'map'}
        >
          {inMapMode ? 'List' : 'Map'}
        </LoggerChip>
      </View>
    </TouchableOpacity>
  )
}
