import React, { useMemo } from 'react'
import { Text, TouchableRipple } from 'react-native-paper'

import { View } from 'react-native'
import { partsForFreqInMHz } from '../../../../tools/frequencyFormats'
import { fmtDateTimeRelative } from '../../../../tools/timeFormats'

export function guessItemHeight (qso, styles) {
  return styles.doubleRow.height + styles.doubleRow.borderBottomWidth
}
const SpotItem = React.memo(function QSOItem ({ spot, onPress, styles, extendedWidth }) {
  const freqParts = useMemo(() => partsForFreqInMHz(spot.frequency), [spot.frequency])

  return (
    <TouchableRipple onPress={() => onPress && onPress({ spot })}>
      <View style={styles.doubleRow}>
        <View style={styles.doubleRowInnerRow}>
          <Text style={styles.fields.freq}>
            <Text style={styles.fields.freqMHz}>{freqParts[0]}</Text>
            <Text style={styles.fields.freqKHz}>.{freqParts[1]}</Text>
            <Text style={styles.fields.freqHz}>.{freqParts[2]}</Text>
          </Text>
          <Text style={styles.fields.call}>{spot.activator ?? '?'}</Text>
          <Text>{fmtDateTimeRelative(spot.timeInMillis)}</Text>
        </View>
        <View style={styles.doubleRowInnerRow}>
          <Text style={styles.fields.band}>{spot.band}</Text>
          <Text style={styles.fields.mode}>{spot.mode}</Text>
          <Text style={styles.fields.name} numberOfLines={1} ellipsizeMode="tail">
            {spot.reference && (
              <>
                {' at '}
                <Text style={styles.text.numbers}>{spot.reference ?? '?'}</Text>
                {': '}
                {[spot.locationDesc, spot.name].join(' • ')}
              </>
            )}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  )
})
export default SpotItem
