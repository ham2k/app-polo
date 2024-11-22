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
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { parseCallsign } from '@ham2k/lib-callsigns'

import { partsForFreqInMHz } from '../../../../tools/frequencyFormats'
import { findBestHook } from '../../../../extensions/registry'

const QSOItem = React.memo(function QSOItem ({ qso, operation, ourInfo, onPress, styles, selected, settings, timeFormatFunction, refHandlers }) {
  const theirInfo = useMemo(() => {
    if (qso?.their?.entityPrefix) {
      return qso?.their
    } else {
      let info = {}
      info = parseCallsign(qso?.their?.call)
      return annotateFromCountryFile(info)
    }
  }, [qso?.their])

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
        info = info.concat(handler.relevantInfoForQSOItem({ qso }))
      })
    } catch (e) {
      console.error('Error in QSOItem', e)
    }
    return info.filter(x => x).join(' ')
  }, [qso, refHandlers])

  const pressHandler = useCallback(() => {
    onPress && onPress({ qso })
  }, [qso, onPress])

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
          {styles.narrowWidth && qso.their?.guess?.emoji && (
            ' ' + qso.their?.guess?.emoji
          )}
        </Text>
        <Text style={styles.fields.location}>
          {theirInfo?.entityPrefix && (settings.dxFlags === 'all' || (settings.dxFlags !== 'none' && theirInfo.entityPrefix !== ourInfo?.entityPrefix)) && (
            ' ' + DXCC_BY_PREFIX[theirInfo.entityPrefix]?.flag
          )}
          {(!!settings.showStateField && (qso?.their?.state || qso?.their?.guess?.state)) && (
            qso?.their?.state || qso?.their?.guess?.state
          )}
        </Text>
        <Text style={styles.fields.name}>
          {!styles.narrowWidth && qso.their?.guess?.emoji && (
            qso.their?.guess?.emoji + ' '
          )}
          {styles.smOrLarger && (
            qso.their?.name ?? qso.their?.guess?.name ?? ''
          )}
        </Text>
        <View style={styles.fields.icons}>
          {qso.notes && (
            <Icon source="note-outline" size={styles.normalFontSize} style={styles.fields.icon} />
          )}
          {qso.spotConfirmed && (
            <View style={styles.fields.icon}><Icon source="check-circle" size={styles.normalFontSize} style={styles.fields.icon} /></View>
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
