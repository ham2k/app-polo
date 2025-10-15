/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'

import { View } from 'react-native'
import { partsForFreqInMHz } from '../../../../tools/frequencyFormats'
import { fmtDateTimeRelative } from '../../../../tools/timeFormats'
import { paperNameOrHam2KIcon } from '../../../../ui'

const SpotItem = React.memo(function QSOItem ({ spot, onPress, styles, extendedWidth }) {
  const freqParts = useMemo(() => partsForFreqInMHz(spot.freq), [spot.freq])

  if (spot?.their?.call === 'W8WR') spot.their.call = 'N2Y'

  const { commonStyle, bandStyle, modeStyle, refStyle, callStyle } = useMemo(() => {
    const workedStyles = {}
    if (spot.spot?.type === 'self') {
      workedStyles.commonStyle = {
        color: styles.colors.tertiary,
        opacity: 0.7
      }
    }
    if (spot.spot?.type === 'duplicate') {
      workedStyles.commonStyle = {
        textDecorationLine: 'line-through',
        textDecorationColor: styles.colors.onBackground,
        opacity: 0.6
      }
    }
    if (spot.spot?.flags?.newBand) {
      workedStyles.bandStyle = {
        fontWeight: 'bold',
        color: styles.colors.important
      }
    }
    if (spot.spot?.flags?.newMode) {
      workedStyles.modeStyle = {
        fontWeight: 'bold',
        color: styles.colors.important
      }
    }
    if (spot.spot?.flags?.specialCall) {
      workedStyles.callStyle = {
        color: styles.colors.bands['40m']
      }
      workedStyles.refStyle = {
        color: styles.colors.bands['40m']
      }
    }
    if (spot.spot?.flags?.newRef || spot.spot?.flags?.newDay) {
      workedStyles.refStyle = {
        fontWeight: 'bold',
        color: styles.colors.important
      }
    }
    if (spot.spot?.flags?.newMult) {
      workedStyles.callStyle = {
        fontWeight: 'bold',
        color: styles.colors.bands['10m']
      }
      workedStyles.refStyle = {
        fontWeight: 'bold',
        color: styles.colors.bands['10m']
      }
    }

    return workedStyles
  }, [spot, styles])

  return (
    <TouchableRipple onPress={() => onPress && onPress({ spot })}>
      <View style={styles.doubleRow}>
        <View style={styles.doubleRowInnerRow}>
          <Text style={[styles.fields.freq, commonStyle]}>
            {freqParts[0] && (
              <Text style={[styles.fields.freqMHz, commonStyle]}>{freqParts[0]}</Text>
            )}
            {freqParts[1] && (
              <Text style={[styles.fields.freqKHz, commonStyle]}>.{freqParts[1]}</Text>
            )}
            {freqParts[2] && (
              <Text style={[styles.fields.freqHz, commonStyle]}>.{freqParts[2]}</Text>
            )}
          </Text>
          <View style={styles.fields.callAndEmoji}>
            <Text style={[styles.fields.call, commonStyle, callStyle]}>{spot.their?.call ?? '?'}</Text>
            {spot.their?.guess?.emoji && (
              <Text style={[styles.fields.emoji, commonStyle, { lineHeight: 20 }]}>{spot.their?.guess?.emoji}</Text>
            )}
            <Text style={[styles.fields.label, commonStyle, callStyle, { marginLeft: styles.oneSpace }]}>{spot.spot.callLabel ?? ''}</Text>
          </View>
          <Text style={[styles.fields.time, commonStyle]}>{fmtDateTimeRelative(spot.spot?.timeInMillis, { roundTo: 'minutes' })}</Text>
        </View>
        <View style={styles.doubleRowInnerRow}>
          <Text style={[styles.fields.band, commonStyle, bandStyle]}>{spot.band}</Text>
          <Text style={[styles.fields.mode, commonStyle, modeStyle]}>{spot.mode}</Text>
          {spot.spots.filter(s => s?.icon).map(subSpot => (
            <View key={subSpot.subSource ?? subSpot.source} style={[styles.fields.icon, commonStyle, refStyle]}>
              <Icon
                key={subSpot.subSource ?? subSpot.source}
                source={paperNameOrHam2KIcon(subSpot.icon)}
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
