import React, { useEffect, useMemo, useState } from 'react'
import { Text } from 'react-native-paper'

import { View } from 'react-native'
import { fmtTimeBetween } from '../../../../../tools/timeFormats'
import { useSelector } from 'react-redux'
import { selectNow } from '../../../../../store/time'

export function OpInfo ({ operation, qsos, styles, style }) {
  const now = useSelector(selectNow)

  const line1 = useMemo(() => {
    if (operation.qsoCount === 0) {
      return 'No QSOs'
    } else {
      return `${operation.qsoCount} ${operation.qsoCount === 1 ? 'QSO' : 'QSOs'}`
    }
  }, [operation])

  const line2 = useMemo(() => {
    const parts = []
    if (now - operation.startOnMillisMax < 1000 * 60 * 60) {
      if (operation.qsoCount > 0) {
        parts.push(`${fmtTimeBetween(operation.startOnMillisMax, now)} since last QSO`)
      }
    }

    // if (operation.startOnMillisMin) {
    //   parts.push(`${fmtTimeBetween(operation.startOnMillisMin, now)} operating`)
    // }

    return parts.filter(x => x).join(' • ')
  }, [operation, now])

  return (
    <View style={[style, { flexDirection: 'column', justifyContent: 'flex-start', minHeight: 2.1 * styles.rem }]}>
      <Text>{line1}</Text>
      <Text>{line2}</Text>
    </View>
  )
}
