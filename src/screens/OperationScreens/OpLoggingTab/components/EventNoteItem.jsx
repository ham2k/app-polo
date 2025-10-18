/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { Text, TouchableRipple } from 'react-native-paper'
import { View } from 'react-native'

import { H2kIcon, H2kMarkdown } from '../../../../ui'

const EventNoteItem = React.memo(function EventNoteItem ({ qso, ourInfo, onPress, styles, selected, settings, timeFormatFunction, refHandlers }) {
  const pressHandler = useCallback(() => {
    onPress && onPress({ qso })
  }, [qso, onPress])

  return (
    <TouchableRipple onPress={pressHandler} style={selected ? styles.selectedRow : styles.unselectedRow}>
      <View style={styles.compactRow}>
        <Text style={styles.fields.time}>{timeFormatFunction(qso.startAtMillis)}</Text>
        <Text style={styles.fields.icons}>
          <H2kIcon name="note-outline" size={styles.normalFontSize} style={styles.fields.icon} />
        </Text>
        <Text style={styles.fields.location}>
          <H2kMarkdown>{qso.event.note}</H2kMarkdown>
        </Text>
      </View>
    </TouchableRipple>
  )
})

export default EventNoteItem
