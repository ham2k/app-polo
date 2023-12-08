import React from 'react'
import { Text } from 'react-native-paper'

import { fmtShortTimeZulu } from '../../../tools/timeFormats'
import { View } from 'react-native'

export default function QSOItem ({ qso, onPress, styles }) {
  return (
    <View style={[styles.compactRow, { flexDirection: 'row', width: '100%' }]}>
      <View style={{ flex: 2 }}><Text style={[{ padding: 0, margin: 0 }, styles.text.numbers]}>{fmtShortTimeZulu(qso.startOnMillis)}</Text></View>
      <View style={{ flex: 3 }}><Text style={[{ paddingLeft: styles.oneSpace }, styles.text.callsign]}>{qso.their?.call ?? '?'}</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.text.numbers}>{qso.our.sent}</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.text.numbers}>{qso.their.sent}</Text></View>
      <View style={{ flex: 2 }}><Text style={styles.text.numbers}>{qso.notes}</Text></View>
    </View>
  )
}
