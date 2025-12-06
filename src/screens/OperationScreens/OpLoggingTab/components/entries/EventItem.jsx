/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import emojiRegex from 'emoji-regex'

import { H2kIcon, H2kMarkdown, H2kPressable } from '../../../../../ui'

const EMOJI_REGEX = emojiRegex()

const EventItem = React.memo(function EventItem (
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
      return { ...styles.eventContent, ...styles.deletedFields }
    } else if (isOtherOperator) {
      return { ...styles.eventContent, ...styles.otherOperatorFields }
    } else {
      return { ...styles.eventContent, ...styles.fields }
    }
  }, [qso.deleted, isOtherOperator, styles.eventContent, styles.deletedFields, styles.otherOperatorFields, styles.fields])

  const textStyle = useMemo(() => {
    if (qso.event?.description?.match(EMOJI_REGEX)) {
      return {
        ...fieldsStyle.event,
        marginTop: styles.oneSpace * -0.2,
        height: styles.oneSpace * 4.3
      }
    } else {
      return fieldsStyle.event
    }
  }, [fieldsStyle.event, qso.event?.description, styles.oneSpace])

  return (
    <H2kPressable onPress={pressHandler} style={rowStyle}>
      <View style={styles.rowInner}>
        <Text style={[fieldsStyle.time, !selected && styles.eventContent]}>{timeFormatFunction(qso.startAtMillis)}</Text>
        <Text style={[fieldsStyle.icons, !selected && styles.eventContent]}>
          <H2kIcon name={qso.event.icon ?? 'information-outline'} style={fieldsStyle.icon} color={!selected && styles.eventContent.color} size={styles.normalFontSize}/>
        </Text>
        <Text style={[textStyle, !selected && styles.eventContent]}>
          <H2kMarkdown style={[!selected && { color: styles.eventContent.color }]}>{qso.event.description ?? qso.event.event.toUpperCase()}</H2kMarkdown>
        </Text>
      </View>
    </H2kPressable>
  )
})

export default EventItem
