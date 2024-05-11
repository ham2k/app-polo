/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { View } from 'react-native'
import { Text, TouchableRipple } from 'react-native-paper'
import { fmtNumber } from '@ham2k/lib-format-tools'

import { fmtDateZuluDynamic } from '../../../tools/timeFormats'
import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'

export default function OperationItem ({ operation, settings, onPress, styles }) {
  const pressHandler = useCallback(() => {
    onPress && onPress(operation)
  }, [onPress, operation])

  return (
    <TouchableRipple onPress={pressHandler} style={styles.rowRoot}>
      <View style={styles.row}>
        <View style={styles.rowTop}>
          <View style={styles.rowTopLeft}>
            <Ham2kMarkdown style={styles.rowText} styles={styles}>**`{operation.stationCall || settings.operatorCall}`**{' '}{operation.title}</Ham2kMarkdown>
          </View>
          <View style={styles.rowTopRight}>
            <View style={styles.countContainer}>
              <Text style={styles.countText}>{fmtNumber(operation.qsoCount ?? 0)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.rowBottom}>
          <View style={styles.rowBottomLeft}>
            <Text style={styles.rowTextSmall} numberOfLines={1} ellipsizeMode={'tail'}>{operation.subtitle}</Text>
          </View>
          <View style={styles.rowBottomRight}>
            {operation.startOnMillisMax && (
              <Text style={styles.rowTextSmall}>{fmtDateZuluDynamic(operation.startOnMillisMax)}</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableRipple>
  )
}
