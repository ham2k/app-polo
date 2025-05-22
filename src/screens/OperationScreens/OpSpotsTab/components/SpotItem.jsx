/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'

import { View } from 'react-native'
import { partsForFreqInMHz } from '../../../../tools/frequencyFormats'
import { fmtDateTimeRelative } from '../../../../tools/timeFormats'

export function guessItemHeight (qso, styles) {
  return styles.doubleRow.height + styles.doubleRow.borderBottomWidth
}
const SpotItem = React.memo(function QSOItem ({ spot, onPress, styles, extendedWidth }) {
  const freqParts = useMemo(() => partsForFreqInMHz(spot.freq), [spot.freq])

  const [commonStyle, bandStyle, modeStyle, refStyle] = useMemo(() => {
    const workedStyles = []
    if (spot.spot?.type === 'self') {
      workedStyles[0] = {
        color: styles.colors.tertiary,
        opacity: 0.7
      }
    }
    if (spot.spot?.type === 'duplicate') {
      workedStyles[0] = {
        textDecorationLine: 'line-through',
        textDecorationColor: styles.colors.onBackground,
        opacity: 0.6
      }
    }
    if (spot.spot?.flags?.newBand) {
      workedStyles[1] = {
        fontWeight: 'bold',
        color: styles.colors.important
      }
    }
    if (spot.spot?.flags?.newMode) {
      workedStyles[2] = {
        fontWeight: 'bold',
        color: styles.colors.important
      }
    }
    if (spot.spot?.flags?.newRef || spot.spot?.flags?.newDay) {
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
          <View style={styles.fields.callAndEmoji}>
            <Text style={[styles.fields.call, commonStyle]}>{spot.their?.call ?? '?'}</Text>
            {spot.their?.guess?.emoji && (
              <Text style={[styles.fields.emoji, commonStyle, { lineHeight: 20 }]}>{spot.their?.guess?.emoji}</Text>
            )}
          </View>
          <Text style={[styles.fields.time, commonStyle]}>{fmtDateTimeRelative(spot.spot?.timeInMillis, { roundTo: 'minutes' })}</Text>
        </View>
        <View style={styles.doubleRowInnerRow}>
          <Text style={[styles.fields.band, commonStyle, bandStyle]}>{spot.band}</Text>
          <Text style={[styles.fields.mode, commonStyle, modeStyle]}>{spot.mode}</Text>
          {spot.spots.filter(s => s?.icon).map(subSpot => (
            <View key={subSpot.source} style={[styles.fields.icon, commonStyle, refStyle]}>
              <Icon
                key={subSpot.source}
                source={subSpot.icon}
                size={styles.oneSpace * 2.3}
                color={(subSpot?.type === 'scoring' && refStyle?.color) || commonStyle?.color}
              />
            </View>
          ))}
          <Text style={[styles.fields.label, commonStyle, refStyle]} numberOfLines={1} ellipsizeMode="tail">
            {spot.spot.emoji}
            {spot.spot.label}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  )
})
export default SpotItem
