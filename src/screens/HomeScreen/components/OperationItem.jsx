/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import { useSelector } from 'react-redux'

import { fmtNumber } from '@ham2k/lib-format-tools'

import { fmtDateZuluDynamic } from '../../../tools/timeFormats'
import { tweakStringForVoiceOver } from '../../../tools/a11yTools'
import { buildTitleForOperation } from '../../OperationScreens/OperationScreen'
import { selectOperation } from '../../../store/operations'
import { H2kMarkdown, H2kPressable } from '../../../ui'

export default function OperationItem ({ operationId, settings, onPress, styles, style }) {
  const operation = useSelector(state => selectOperation(state, operationId))
  const pressHandler = useCallback(() => {
    onPress && onPress(operation)
  }, [onPress, operation])

  const title = useMemo(() => {
    return buildTitleForOperation(operation, { includeCall: false })
  }, [operation])

  const rowStyle = useMemo(() => {
    return {
      ...styles.row,
      ...(operation.deleted ? { opacity: 0.5 } : {}),
      paddingHorizontal: 0,
      paddingLeft: Math.max(styles?.row?.paddingHorizontal, style?.paddingLeft ?? 0),
      paddingRight: Math.max(styles.row.paddingHorizontal, style?.paddingRight ?? 0)
    }
  }, [styles, style, operation.deleted])

  const textStyle = useMemo(() => {
    return {
      ...styles.rowText,
      ...(operation.deleted ? { textDecorationLine: 'line-through' } : {})
    }
  }, [styles.rowText, operation.deleted])

  return (
    <H2kPressable
      onPress={pressHandler}
      accessibilityLabel={tweakStringForVoiceOver(`${operation.stationCallPlus || operation.stationCall} ${title}, ${operation.subtitle}, ${operation.qsoCount ?? 0} Q sos, ${fmtDateZuluDynamic(operation.startAtMillisMax)}`)}
      style={styles.rowRoot}
    >
      <View style={rowStyle}>
        <View style={styles.rowTop}>
          <View style={styles.rowTopLeft}>
            <H2kMarkdown style={textStyle} styles={styles}>**`{operation.stationCallPlus || operation.stationCall}`**{' '}{title}</H2kMarkdown>
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
    </H2kPressable>
  )
}
