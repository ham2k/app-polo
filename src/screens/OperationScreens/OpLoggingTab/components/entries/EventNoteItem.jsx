/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { H2kIcon, H2kMarkdown, H2kPressable } from '../../../../../ui'

const EventNoteItem = React.memo(function EventNoteItem (
  { qso, ourInfo, onPress, styles, selected, isOtherOperator, settings, timeFormatFunction, refHandlers }
) {
  const pressHandler = useCallback(() => {
    onPress && onPress({ qso })
  }, [qso, onPress])

  const rowStyle = useMemo(() => {
    return {
      ...styles.row,
      ...styles.eventRow,
      ...(isOtherOperator ? styles.otherOperatorRow : {}),
      ...(selected ? styles.selectedRow : {}),
      ...(qso.deleted ? styles.deletedRow : {})
    }
  }, [isOtherOperator, qso.deleted, selected, styles.deletedRow, styles.eventRow, styles.otherOperatorRow, styles.row, styles.selectedRow])

  const fieldsStyle = useMemo(() => {
    if (qso.deleted) {
      return styles.deletedFields
    } else if (isOtherOperator) {
      return styles.otherOperatorFields
    } else {
      return styles.fields
    }
  }, [qso.deleted, isOtherOperator, styles.deletedFields, styles.otherOperatorFields, styles.fields])

  const icon = useMemo(() => {
    if (qso.event?.event === 'todo' && qso.deleted) {
      return 'sticker-outline'
    } else if (qso.event?.event === 'todo' && qso.event?.done) {
      return 'sticker-check-outline'
    } else if (qso.event?.event === 'todo' && !qso.event?.done) {
      return 'sticker'
    } else {
      return 'sticker-text-outline'
    }
  }, [qso.event?.event, qso.event?.done, qso.deleted])

  return (
    <H2kPressable onPress={pressHandler} style={rowStyle}>
      <View style={styles.rowInner}>
        <Text style={[fieldsStyle.time, !selected && styles.eventContent]}>{timeFormatFunction(qso.startAtMillis)}</Text>
        <Text style={[fieldsStyle.icons, !selected && styles.eventContent]}>
          <H2kIcon name={icon} style={fieldsStyle.icon} color={!selected && styles.eventContent.color}/>
        </Text>
        <Text style={[fieldsStyle.event, !selected && styles.eventContent]}>
          <H2kMarkdown style={[fieldsStyle.markdown, !selected && { color: styles.eventContent.color }]}>{qso.event.note}</H2kMarkdown>
        </Text>
      </View>
    </H2kPressable>
  )
})

export default EventNoteItem
