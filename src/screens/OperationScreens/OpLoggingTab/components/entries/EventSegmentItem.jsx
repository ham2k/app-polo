/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { H2kIcon, H2kPressable } from '../../../../../ui'
import { describeOperation } from '../../../../../store/operations'

const EventSegmentItem = React.memo(function EventSegmentItem (
  { qso, ourInfo, onPress, styles, selected, isOtherOperator, settings, timeFormatFunction, refHandlers }
) {
  const pressHandler = useCallback(() => {
    onPress && onPress({ qso })
  }, [qso, onPress])

  const icon = useMemo(() => {
    if (qso.event?.event === 'start' || qso.event?.event === 'break') {
      return 'format-page-break'
    } else if (qso.event?.event === 'end') {
      return 'flag-checkered'
    } else {
      return qso.event?.icon ?? 'information-outline'
    }
  }, [qso])

  const description = useMemo(() => {
    return describeOperation({ operation: qso.event?.operation })
  }, [qso.event?.operation])

  const rowStyle = useMemo(() => {
    return {
      ...styles.row,
      ...styles.segmentRow,
      ...(isOtherOperator ? styles.otherOperatorRow : {}),
      ...(selected ? styles.selectedRow : {}),
      ...(qso.deleted ? styles.deletedRow : {})
    }
  }, [isOtherOperator, qso.deleted, selected, styles.deletedRow, styles.otherOperatorRow, styles.row, styles.segmentRow, styles.selectedRow])

  const fieldsStyle = useMemo(() => {
    if (qso.deleted) {
      return { ...styles.segmentContent, ...styles.deletedFields }
    } else if (isOtherOperator) {
      return { ...styles.segmentContent, ...styles.otherOperatorFields }
    } else {
      return { ...styles.segmentContent, ...styles.fields }
    }
  }, [qso.deleted, isOtherOperator, styles.segmentContent, styles.deletedFields, styles.otherOperatorFields, styles.fields])

  return (
    <H2kPressable onPress={pressHandler} style={rowStyle}>
      <View style={styles.rowInner}>
        <Text numberOfLines={1} style={fieldsStyle.time}>{timeFormatFunction(qso.startAtMillis)}</Text>
        <Text numberOfLines={1} style={fieldsStyle.icons}>
          <H2kIcon name={icon} style={fieldsStyle.icon} size={styles.normalFontSize} />
        </Text>
        <Text numberOfLines={1} ellipsizeMode={'tail'} style={fieldsStyle.location}>
          {description}
        </Text>
      </View>
    </H2kPressable>
  )
})

export default EventSegmentItem
