/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { Text, TouchableRipple } from 'react-native-paper'

import { fmtNumber } from '@ham2k/lib-format-tools'

import { fmtDateZuluDynamic } from '../../../tools/timeFormats'
import { tweakStringForVoiceOver } from '../../../tools/a11yTools'
import { buildTitleForOperation } from '../../OperationScreens/OperationScreen'
import { H2kMarkdown } from '../../../ui'

export default function OperationItem ({ operation, settings, onPress, styles, style }) {
  const pressHandler = useCallback(() => {
    onPress && onPress(operation)
  }, [onPress, operation])

  const title = useMemo(() => {
    return buildTitleForOperation(operation, { includeCall: false })
  }, [operation])

  const rowStyle = useMemo(() => {
    return {
      ...styles.row,
      paddingHorizontal: 0,
      paddingLeft: Math.max(styles?.row?.paddingHorizontal, style?.paddingLeft ?? 0),
      paddingRight: Math.max(styles.row.paddingHorizontal, style?.paddingRight ?? 0)
    }
  }, [styles, style])
  return (
    <TouchableRipple
      onPress={pressHandler}
      style={styles.rowRoot}
      accessibilityLabel={tweakStringForVoiceOver(`${operation.stationCallPlus || operation.stationCall} ${title} ${operation.subtitle}, ${operation.qsoCount ?? 0} Q sos, ${fmtDateZuluDynamic(operation.startAtMillisMax)}`)}
    >
      <View style={rowStyle}>
        <View style={styles.rowTop}>
          <View style={styles.rowTopLeft}>
            <H2kMarkdown style={styles.rowText} styles={styles}>**`{operation.stationCallPlus || operation.stationCall}`**{' '}{title}</H2kMarkdown>
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
            {operation.startAtMillisMax && (
              <Text style={styles.rowTextSmall}>{fmtDateZuluDynamic(operation.startAtMillisMax)}</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableRipple>
  )
}
