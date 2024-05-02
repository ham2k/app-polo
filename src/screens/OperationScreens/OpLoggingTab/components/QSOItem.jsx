/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'

import { fmtDateTimeZuluDynamic } from '../../../../tools/timeFormats'
import { View } from 'react-native'

import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { partsForFreqInMHz } from '../../../../tools/frequencyFormats'
import { findBestHook } from '../../../../extensions/registry'

export function guessItemHeight (qso, styles) {
  return styles.compactRow.height + styles.compactRow.borderBottomWidth
}

const QSOItem = React.memo(function QSOItem ({ qso, number, ourInfo, onPress, styles, selected, settings }) {
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
  // console.log('qso item', qso.key)
  return (
    <TouchableRipple onPress={() => onPress && onPress({ qso })} style={{ backgroundColor: selected ? styles.theme.colors.secondaryContainer : undefined }}>
      <View style={styles.compactRow}>
        <Text style={styles.fields.number}>{number}</Text>
        <Text style={styles.fields.time}>{fmtDateTimeZuluDynamic(qso.startOnMillis, { compact: !styles.extendedWidth })}</Text>
        <Text style={styles.fields.freq}>
          {freqParts[0] && <Text style={styles.fields.freqMHz}>{freqParts[0]}.</Text>}
          {freqParts[1] && <Text style={styles.fields.freqKHz}>{freqParts[1]}</Text>}
          {freqParts[2] && <Text style={styles.fields.freqHz}>
            {styles.mdOrLarger ? `.${freqParts[2]}` : `.${freqParts[2].substring(0, 1)}`}
          </Text>}
        </Text>
        <Text style={styles.fields.call}>
          {qso.their?.call ?? '?'}
        </Text>
        <Text style={styles.fields.location}>
          {theirInfo?.entityPrefix && (settings.dxFlags === 'all' || (settings.dxFlags !== 'none' && theirInfo.entityPrefix !== ourInfo?.entityPrefix)) && (
            ' ' + DXCC_BY_PREFIX[theirInfo.entityPrefix]?.flag
          )}
          {(qso?.their?.state || qso?.their?.guess?.state) && (
            qso?.their?.state || qso?.their?.guess?.state
          )}
        </Text>
        <Text style={styles.fields.name}>
          {styles.smOrLarger && (
            qso.their?.name ?? qso.their?.lookup?.name ?? ''
          )}
        </Text>
        <Text style={styles.fields.icon}>
          {qso.their?.guess?.emoji && (
            qso.their?.guess?.emoji + ' '
          )}
          {qso.notes && (
            <Icon source="note-outline" size={styles.normalFontSize} style={styles.fields.icon} />
          )}
          {(qso.refs || []).map(ref => ({ ref, handler: findBestHook(`ref:${ref.type}`) })).filter(x => x.handler?.iconForQSO).map(({ ref, handler }, i) => (
            <Icon key={i} source={handler?.iconForQSO} size={styles.normalFontSize} style={styles.fields.icon} color={styles.fields.icon.color} />
          ))}
        </Text>
        {qso?.their?.exchange ? (
          <>
            {styles.mdOrLarger && (
              <Text style={styles.fields.signal}>{settings.switchSentRcvd ? qso?.their?.sent : qso?.our?.sent}{' '}{settings.switchSentRcvd ? qso?.our?.sent : qso?.their?.sent}</Text>
            )}
            <Text style={styles.fields.exchange}>{qso?.their?.exchange}</Text>
          </>
        ) : (
          <Text style={styles.fields.signal}>{settings.switchSentRcvd ? qso?.their?.sent : qso?.our?.sent}{' '}{settings.switchSentRcvd ? qso?.our?.sent : qso?.their?.sent}</Text>
        )}
      </View>
    </TouchableRipple>
  )
})
export default QSOItem
