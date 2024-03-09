import React, { useMemo } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'

import { View } from 'react-native'
import { fmtTimeBetween } from '../../../../../tools/timeFormats'
import { useSelector } from 'react-redux'
import { selectNow } from '../../../../../store/time'

export function OpInfo ({ operation, qsos, styles, style, themeColor }) {
  const now = useSelector(selectNow)

  const line1 = useMemo(() => {
    if (operation.qsoCount === 0) {
      return "No QSOs... Let's get on the air!"
    } else {
      const parts = []

      parts.push(`${operation.qsoCount} ${operation.qsoCount === 1 ? 'QSO' : 'QSOs'} in ${fmtTimeBetween(operation.startOnMillisMin, operation.startOnMillisMax)}`)

      if (now - operation.startOnMillisMax < 1000 * 60 * 60 * 4) {
        if (operation.qsoCount > 0) {
          parts.push(`${fmtTimeBetween(operation.startOnMillisMax, now)} since last QSO`)
        }
      }
      return parts.filter(x => x).join(' • ')
    }
  }, [operation, now])

  const line2 = useMemo(() => {
    const parts = []

    const last = qsos?.length - 1
    if (last > 9) {
      const rate = (10 / ((qsos[last].startOnMillis - qsos[last - 9].startOnMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 10`)
    }
    if (last > 99) {
      const rate = (100 / ((qsos[last].startOnMillis - qsos[last - 9].startOnMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 100`)
    }

    return parts.filter(x => x).join(' • ')
  }, [qsos])

  return (
    <TouchableRipple onPress={() => true} style={{ height: styles.oneSpace * 5 }}>

      <View style={[style, { flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'flex-start', gap: styles.halfSpace }]}>
        <View style={{ flex: 0, alignSelf: 'flex-start' }}>
          <Icon
            source={'timer-outline'}
            size={styles.oneSpace * 3}
            color={styles.theme.colors[`${themeColor}ContainerVariant`]}
          />
        </View>
        <View style={[style, { flex: 1, flexDirection: 'column', justifyContent: 'flex-start', paddingTop: styles.oneSpace * 0.3 }]}>
          {line1 && <Text numberOfLines={2} ellipsizeMode={'tail'}>{line1}</Text>}
          {line2 && <Text numberOfLines={2} ellipsizeMode={'tail'}>{line2}</Text>}
        </View>
      </View>
    </TouchableRipple>
  )
}
