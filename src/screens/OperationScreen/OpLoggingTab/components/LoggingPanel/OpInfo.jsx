import React, { useMemo } from 'react'
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
      const parts = []
      parts.push(`${operation.qsoCount} ${operation.qsoCount === 1 ? 'QSO' : 'QSOs'}`)

      const last = qsos?.length - 1
      if (last > 9) {
        const rate = (10 / ((qsos[last].startOnMillis - qsos[last - 9].startOnMillis) / 1000 / 60)) * 60
        parts.push(`${rate.toFixed(0)} Q/h for last 10`)
      }
      if (last > 99) {
        const rate = (100 / ((qsos[last].startOnMillis - qsos[last - 9].startOnMillis) / 1000 / 60)) * 60
        parts.push(`${rate.toFixed(0)} Q/h for last 100`)
      }
      return parts.join(' • ')
    }
  }, [operation, qsos])

  const line2 = useMemo(() => {
    const parts = []
    if (now - operation.startOnMillisMax < 1000 * 60 * 60) {
      if (operation.qsoCount > 0) {
        parts.push(`${fmtTimeBetween(operation.startOnMillisMax, now)} since last QSO`)
      }
    }

    return parts.filter(x => x).join(' • ')
  }, [operation, now])

  return (
    <View style={[style, { flexDirection: 'column', justifyContent: 'flex-start' }]}>
      <Text>{line1}</Text>
      <Text>{line2}</Text>
    </View>
  )
}
