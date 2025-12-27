/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'

const SpotHeader = React.memo(function SpotHeader ({ section, styles }) {
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.fields.header, styles.text.bold]}>
        {section.label}
      </Text>
    </View>
  )
})
export default SpotHeader
