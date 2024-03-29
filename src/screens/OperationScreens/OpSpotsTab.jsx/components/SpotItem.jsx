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

  const [commonStyle, bandStyle, modeStyle, refStyle] = useMemo(() => {
    const workedStyles = []
    if (spot._ourSpot) {
      workedStyles[0] = {
        color: styles.colors.tertiary,
        opacity: 0.8
      }
    }
    if (spot._worked) {
      workedStyles[0] = {
        textDecorationLine: 'line-through',
        textDecorationColor: styles.colors.onBackground,
        opacity: 0.8
      }
    }
    if (spot._newBand) {
      workedStyles[1] = {
        fontWeight: 'bold',
        color: styles.colors.important
      }
    }
    if (spot._newMode) {
      workedStyles[2] = {
        fontWeight: 'bold',
        color: styles.colors.important
      }
    }
    if (spot._newReference) {
      workedStyles[3] = {
        fontWeight: 'bold',
        color: styles.colors.important
      }
    }
    return workedStyles
  }, [spot, styles])

  return (
    <TouchableRipple onPress={() => onPress && onPress({ spot })}>
      <View style={styles.doubleRow}>
        <View style={styles.doubleRowInnerRow}>
          <Text style={[styles.fields.freq, commonStyle]}>
            <Text style={[styles.fields.freqMHz, commonStyle]}>{freqParts[0]}</Text>
            <Text style={[styles.fields.freqKHz, commonStyle]}>.{freqParts[1]}</Text>
            <Text style={[styles.fields.freqHz, commonStyle]}>.{freqParts[2]}</Text>
          </Text>
          <Text style={[styles.fields.call, commonStyle]}>{spot.activator ?? '?'}</Text>
          <Text style={[commonStyle]}>{fmtDateTimeRelative(spot.timeInMillis)}</Text>
        </View>
        <View style={styles.doubleRowInnerRow}>
          <Text style={[styles.fields.band, commonStyle, bandStyle]}>{spot.band}</Text>
          <Text style={[styles.fields.mode, commonStyle, modeStyle]}>{spot.mode}</Text>
          <Text style={[styles.fields.name, commonStyle, refStyle]} numberOfLines={1} ellipsizeMode="tail">
            {spot.reference && (
              <>
                {' at '}
                <Text style={[styles.text.numbers, commonStyle, refStyle]}>{spot.reference ?? '?'}</Text>
                {': '}
                {[spot.locationDesc.substring(3, 6), spot.shortName ?? spot.name].join(' • ')}
              </>
            )}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  )
})
export default SpotItem
