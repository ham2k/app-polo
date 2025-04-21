/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'
import { View } from 'react-native'

import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

import { partsForFreqInMHz } from '../../../../tools/frequencyFormats'
import { findBestHook } from '../../../../extensions/registry'

const QSOItem = React.memo(function QSOItem ({ qso, ourInfo, onPress, styles, selected, settings, timeFormatFunction, refHandlers }) {
  const theirInfo = { ...qso?.their?.guess, ...qso?.their }

  const freqParts = useMemo(() => {
    if (qso.freq) {
      return partsForFreqInMHz(qso.freq)
    } else {
      return [null, qso.band, null]
    }
  }, [qso])

  const extraInfo = useMemo(() => {
    let info = []
    try {
      (refHandlers || []).forEach(handler => {
        const x = handler.relevantInfoForQSOItem({ qso })
        if (x) info = info.concat(x)
      })
    } catch (e) {
      console.error('Error in QSOItem', e)
    }
    return info.filter(x => x).map(x => x.trim()).join(' ')
  }, [qso, refHandlers])

  const pressHandler = useCallback(() => {
    onPress && onPress({ qso })
  }, [qso, onPress])

  const confirmedBySpot = Object.values(qso?.qsl ?? {}).some(spot => spot?.isGuess === false)
  const bustedBySpot = Object.values(qso?.qsl ?? {}).some(spot => spot?.isGuess === true)

  return (
    <TouchableRipple onPress={pressHandler} style={selected ? styles.selectedRow : styles.unselectedRow}>
      <View style={styles.compactRow}>
        <Text style={styles.fields.time}>{timeFormatFunction(qso.startAtMillis)}</Text>
        <Text style={styles.fields.freq}>
          {freqParts[0] && <Text style={styles.fields.freqMHz}>{freqParts[0]}.</Text>}
          {freqParts[1] && <Text style={styles.fields.freqKHz}>{freqParts[1]}</Text>}
          {freqParts[2] && <Text style={styles.fields.freqHz}>
            {styles.mdOrLarger ? `.${freqParts[2]}` : `.${freqParts[2].substring(0, 1)}`}
          </Text>}
        </Text>
        <Text style={styles.fields.call}>
          {qso.their?.call ?? '?'}
          {styles.narrowWidth && theirInfo?.emoji && (
            ' ' + theirInfo?.emoji
          )}
        </Text>
        <Text style={styles.fields.location}>
          {theirInfo?.entityPrefix && (settings.dxFlags === 'all' || (settings.dxFlags !== 'none' && theirInfo.entityPrefix !== ourInfo?.entityPrefix)) && (
            ' ' + DXCC_BY_PREFIX[theirInfo.entityPrefix]?.flag
          )}
          {(!!settings.showStateField && theirInfo?.state)}
        </Text>
        <Text style={styles.fields.name}>
          {!styles.narrowWidth && theirInfo?.emoji && (
            theirInfo?.emoji + ' '
          )}
          {styles.smOrLarger && theirInfo?.name}
        </Text>
        <View style={styles.fields.icons}>
          {qso.notes && (
            <Icon source="note-outline" size={styles.normalFontSize} style={styles.fields.icon} />
          )}
          {(confirmedBySpot || bustedBySpot) && (
            <View style={styles.fields.icon}><Icon source={`${confirmedBySpot ? 'check' : 'help'}-circle`} size={styles.normalFontSize} style={styles.fields.icon} /></View>
          )}
          {(qso.refs || []).map(ref => ({ ref, handler: findBestHook(`ref:${ref.type}`) })).filter(x => x.handler?.iconForQSO).map(({ ref, handler }, i) => (
            <View key={i} style={styles.fields.icon}><Icon key={i} source={handler?.iconForQSO} size={styles.normalFontSize} color={styles.fields.icon.color} /></View>
          ))}
        </View>
        {extraInfo ? (
          <>
            {styles.mdOrLarger && (
              <Text style={styles.fields.signal}>{settings.switchSentRcvd ? qso?.their?.sent : qso?.our?.sent}{' '}{settings.switchSentRcvd ? qso?.our?.sent : qso?.their?.sent}</Text>
            )}
            <Text style={styles.fields.exchange}>{extraInfo}</Text>
          </>
        ) : (
          <Text style={styles.fields.signal}>{settings.switchSentRcvd ? qso?.their?.sent : qso?.our?.sent}{' '}{settings.switchSentRcvd ? qso?.our?.sent : qso?.their?.sent}</Text>
        )}
      </View>
    </TouchableRipple>
  )
})
export default QSOItem
