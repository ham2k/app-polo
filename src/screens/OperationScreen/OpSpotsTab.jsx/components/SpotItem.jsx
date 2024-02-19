import React from 'react'
import { Text, TouchableRipple } from 'react-native-paper'

import { View } from 'react-native'
import { fmtFreqInMHz } from '../../../../tools/frequencyFormats'

export function guessItemHeight (qso, styles) {
  return styles.compactRow.height + styles.compactRow.borderBottomWidth
}

const SpotItem = React.memo(function QSOItem ({ spot, onPress, styles, extendedWidth }) {
  return (
    <TouchableRipple onPress={() => onPress && onPress({ spot })}>
      <View style={styles.compactRow}>
        <Text style={styles.fields.freq}>{spot.frequency ? fmtFreqInMHz(spot.frequency) : '?'}</Text>
        <Text style={styles.fields.mode}>{spot.mode ?? '?'}</Text>
        <Text style={styles.fields.call}>{spot.activator ?? '?'}</Text>
        <Text style={styles.fields.reference}>{spot.reference ?? '?'}</Text>
        <Text style={styles.fields.name}>{spot.name ?? '?'}</Text>
      </View>
    </TouchableRipple>
  )
})
export default SpotItem
