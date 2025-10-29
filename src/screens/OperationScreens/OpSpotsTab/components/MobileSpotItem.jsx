/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { Icon, Text } from 'react-native-paper'

import { View } from 'react-native'
import { partsForFreqInMHz } from '../../../../tools/frequencyFormats'
import { fmtDateTimeRelative, prepareTimeValue } from '../../../../tools/timeFormats'
import { paperNameOrHam2KIcon, H2kPressable } from '../../../../ui'

/**
 * When settings Mobile Mode is true, this is used to render spots in SpotList.
 *
 * It's the same as SpotItem but with some padding and different layout for better viewing
 * while mobile with a phone or tablet in a mounted holder.
 */
const MobileSpotItem = React.memo(function QSOItemMobile ({ spot, styles, onPress, onLongPress }) {
  const freqParts = useMemo(() => partsForFreqInMHz(spot.freq), [spot.freq])

  if (spot?.their?.call === 'W8WR') spot.their.call = 'N2Y'

  const { commonStyle, modeStyle, refStyle, callStyle } = useMemo(() => {
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
    // no band on mobile spot item
    // if (spot.spot?.flags?.newBand) {
    //   workedStyles.bandStyle = {
    //     fontWeight: 'bold',
    //     color: styles.colors.important
    //   }
    // }
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

  function getTimeColor (millis) {
    const t1 = prepareTimeValue(millis)
    const t2 = prepareTimeValue(new Date())

    if (t1 && t2) {
      const diff = t2 - t1

      if (diff > (20 * 60 * 1000)) {
        return styles.mobile.time.oldest
      } else if (diff > (15 * 60 * 1000)) {
        return styles.mobile.time.old
      } else if (diff <= (2 * 60 * 1000)) {
        return styles.mobile.time.new
      }
    }
    return styles.mobile.time.normal
  };

  return (
    <H2kPressable
      onPress={() => onPress && onPress({ spot })}
      onLongPress={() => onLongPress && onLongPress({ spot })}
      rippleColor='rgba(0, 255, 255, .32)'
    >
      <View style={styles.doubleRowMobileMode}>
        <View style={styles.doubleRowMobileModeLeft}>
          <View style={[styles.mobile.freq, commonStyle]}>
            <View>
              <Text style={[styles.mobile.freqMHz, commonStyle]}>{freqParts[0]}</Text>
            </View>
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <Text style={[styles.mobile.freqKHz, commonStyle]}>.{freqParts[1]}</Text>
              {freqParts[2] !== '000' && (
                <Text style={[styles.mobile.freqHz, commonStyle]}>.{freqParts[2]}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.doubleRowMobileModeRight}>
          <View style={styles.doubleRowInnerRowMobile}>
            <View style={styles.fields.callAndEmoji}>
              <Text style={[styles.mobile.call, commonStyle, callStyle]}>{spot.their?.call ?? '?'}</Text>
              {spot.their?.guess?.emoji && (
                <Text style={[styles.fields.emoji, commonStyle, { lineHeight: 20 }]}>{spot.their?.guess?.emoji}</Text>
              )}
            </View>
            <Text style={[styles.fields.time, commonStyle, getTimeColor(spot.spot?.timeInMillis)]}>{fmtDateTimeRelative(spot.spot?.timeInMillis, { roundTo: 'minutes' })}</Text>
          </View>
          <View style={[styles.doubleRowInnerRowMobile, { marginTop: 5 }]}>
            <Text style={[styles.mobile.mode, commonStyle, modeStyle]}>{spot.mode}</Text>
            {spot.spots.filter(s => s?.icon).map(subSpot => (
              <View key={subSpot.source} style={[styles.fields.icon, commonStyle, refStyle]}>
                <Icon
                  key={subSpot.source}
                  source={paperNameOrHam2KIcon(subSpot.icon)}
                  size={styles.oneSpace * 2.3}
                  color={(subSpot?.type === 'scoring' && refStyle?.color) || commonStyle?.color}
                />
              </View>
            ))}
            <Text style={[styles.mobile.label, commonStyle, refStyle]} numberOfLines={1} ellipsizeMode="tail">
              {spot.spot.emoji}
              {spot.spot.label}
            </Text>
          </View>
        </View>
      </View>
    </H2kPressable>
  )
})
export default MobileSpotItem
