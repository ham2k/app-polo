/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { fmtTimeBetween } from '../../../../tools/timeFormats'
import { selectSecondsTick } from '../../../../store/time'

function prepareStyles (baseStyles, themeColor) {
  return {
    ...baseStyles,
    root: {
      padding: baseStyles.oneSpace * 2,
      flexDirection: 'column'
    },
    section: {
      flexDirection: 'column',
      marginVertical: baseStyles.oneSpace
    }
  }
}

export function OpInfoPanel ({ operation, qsos, style, themeColor }) {
  const styles = useThemedStyles(prepareStyles, themeColor)

  const now = useSelector(selectSecondsTick)

  const line1 = useMemo(() => {
    if (qsos.length === 0) {
      return "No QSOs... Let's get on the air!"
    } else {
      const parts = []

      parts.push(`${qsos.length} ${qsos.length === 1 ? 'QSO' : 'QSOs'} in ${fmtTimeBetween(operation.startOnMillisMin, operation.startOnMillisMax)}`)

      if (now - operation.startOnMillisMax < 1000 * 60 * 60 * 4) {
        if (qsos.length > 0) {
          parts.push(`${fmtTimeBetween(operation.startOnMillisMax, now)} since last QSO`)
        }
      }
      return parts.filter(x => x).join(' • ')
    }
  }, [qsos, operation, now])

  const line2 = useMemo(() => {
    const parts = []

    const last = qsos?.length - 1
    if (last > 9) {
      const rate = (10 / ((qsos[last].startOnMillis - qsos[last - 9].startOnMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 10`)
    }
    if (last > 99) {
      const rate = (100 / ((qsos[last].startOnMillis - qsos[last - 99].startOnMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 100`)
    }

    return parts.filter(x => x).join(' • ')
  }, [qsos])

  return (
    <View style={[style, styles.root]}>
      <View style={styles.section}>
        <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
          Operation Stats
        </Text>
        {line1 && <Text variant="bodyLarge" numberOfLines={2} ellipsizeMode={'tail'}>{line1}</Text>}
        {line2 && <Text variant="bodyLarge" numberOfLines={2} ellipsizeMode={'tail'}>{line2}</Text>}
      </View>
    </View>
  )
}
