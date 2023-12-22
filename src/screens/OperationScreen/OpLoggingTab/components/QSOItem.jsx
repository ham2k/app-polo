import React from 'react'
import { Text } from 'react-native-paper'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'
import { View } from 'react-native'

const REF_LABELS = {
  potaActivation: false,
  pota: 'POTA'
}

export default function QSOItem ({ qso, onPress, styles }) {
  const multiRow = qso.notes || (qso?.refs?.length > 0)

  return (
    <>
      <View style={[styles.compactRow, { flexDirection: 'row', width: '100%' }, multiRow ? { borderBottomWidth: 0 } : {}]}>
        <View style={{ flex: 0, marginLeft: 0, alignContent: 'right', minWidth: styles.rem * 1 }}>
          <Text style={[styles.text.numbers, { textAlign: 'right' }]}>{qso._number}</Text>
        </View>
        <View style={{ flex: 0, minWidth: styles.rem * 3, marginLeft: styles.oneSpace * 1.5 }}>
          <Text style={[styles.text.numbers, styles.text.lighter, { textAlign: 'right' }]}>{fmtShortTimeZulu(qso.startOnMillis)}</Text>
        </View>
        <View style={{ flex: 0, minWidth: styles.rem * 2, marginLeft: styles.oneSpace * 1.5, alignContent: 'right' }}>
          <Text style={[styles.text.numbers, styles.text.lighter]}>{qso.freq ?? '21.125.25'}</Text>
        </View>
        <View style={{ flex: 3, marginLeft: styles.oneSpace * 1.5, minWidth: styles.rem * 3 }}>
          <Text style={styles.text.callsign}>{qso.their?.call ?? '?'}</Text>
        </View>
        <View style={{ flex: 0, marginLeft: styles.oneSpace * 1.5, minWidth: styles.rem * 2, alignContent: 'right' }}>
          <Text style={[styles.text.numbers, { textAlign: 'right' }]}>{qso.our.sent}</Text>
        </View>
        <View style={{ flex: 0, marginLeft: styles.oneSpace, minWidth: styles.rem * 2, alignContent: 'right' }}>
          <Text style={[styles.text.numbers, { textAlign: 'right' }]}>{qso.their.sent}</Text>
        </View>
      </View>
      {multiRow && (
        <View style={[styles.compactRow, { flexDirection: 'column', width: '100%', paddingTop: 0 }]}>
          {qso.notes && (
            <View style={{ flex: 2, marginLeft: 4 * styles.rem, flexDirection: 'row' }}>
              <Text style={{ fontWeight: '600', marginRight: styles.oneSpace }}>Notes:</Text><Text>{qso.notes}</Text>
            </View>
          )}
          {(qso.refs || []).filter(ref => REF_LABELS[ref.type]).map((ref, i) => (
            <View key={`${ref.type}-${i}`} style={{ flex: 2, marginLeft: 4 * styles.rem, flexDirection: 'row' }}>
              <Text style={{ fontWeight: '600', marginRight: styles.oneSpace }}>{REF_LABELS[ref.type]}:</Text><Text>{ref.ref}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  )
}
