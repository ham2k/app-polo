/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { Text } from 'react-native-paper'
import { View } from 'react-native'
import emojiRegex from 'emoji-regex'

import { H2kIcon, H2kMarkdown, H2kPressable } from '../../../../ui'

const EMOJI_REGEX = emojiRegex()

const EventItem = React.memo(function NoteItem ({ qso, ourInfo, onPress, styles, selected, settings, timeFormatFunction, refHandlers }) {
  const pressHandler = useCallback(() => {
    onPress && onPress({ qso })
  }, [qso, onPress])

  const textStyle = useMemo(() => {
    let marginTop = styles.oneSpace * 0.2
    if (qso.event?.description?.match(EMOJI_REGEX)) {
      marginTop = styles.oneSpace * -0.2
    }

    return {
      ...styles.fields.location,
      marginTop,
      height: styles.oneSpace * 5,
      lineHeight: styles.normalFontSize * 2
    }
  }, [styles, qso.event?.description])

  return (
    <H2kPressable onPress={pressHandler} style={selected ? styles.selectedRow : styles.unselectedRow}>
      <View style={styles.compactRow}>
        <Text style={styles.fields.time}>{timeFormatFunction(qso.startAtMillis)}</Text>
        <Text style={styles.fields.icons}>
          <H2kIcon name={qso.event.icon ?? 'information-outline'} size={styles.normalFontSize} style={styles.fields.icon} />
        </Text>
        <Text style={textStyle}>
          <H2kMarkdown>{qso.event.description ?? qso.event.event.toUpperCase()}</H2kMarkdown>
        </Text>
      </View>
    </H2kPressable>
  )
})

export default EventItem
