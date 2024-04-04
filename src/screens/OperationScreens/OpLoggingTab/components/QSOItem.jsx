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

const REFS_TO_INCLUDE = {
  pota: true,
  sota: true,
  wwff: true,
  custom: true
}

const QSOItem = React.memo(function QSOItem ({ qso, ourInfo, onPress, styles, selected, extendedWidth, settings }) {
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

  return (
    <TouchableRipple onPress={() => onPress && onPress({ qso })} style={{ backgroundColor: selected ? styles.theme.colors.secondaryLight : undefined }}>
      <View style={styles.compactRow}>
        <Text style={styles.fields.number}>{qso._number}</Text>
        <Text style={styles.fields.time}>{fmtDateTimeZuluDynamic(qso.startOnMillis, { compact: !extendedWidth })}</Text>
        <Text style={styles.fields.freq}>
          {freqParts[0] && <Text style={styles.fields.freqMHz}>{freqParts[0]}.</Text>}
          {freqParts[1] && <Text style={styles.fields.freqKHz}>{freqParts[1]}</Text>}
          {freqParts[2] && <Text style={styles.fields.freqHz}>
            {extendedWidth ? `.${freqParts[2]}` : `.${freqParts[2].substring(0, 1)}`}
          </Text>}
        </Text>
        <Text style={styles.fields.call}>
          {qso.their?.call ?? '?'}
        </Text>
        <Text style={styles.fields.location}>
          {theirInfo?.entityPrefix && (settings.dxFlags === 'all' || (settings.dxFlags !== 'none' && theirInfo.entityPrefix !== ourInfo?.entityPrefix)) && (
            <Text style={styles.fields.badges}>
              {' '}{DXCC_BY_PREFIX[theirInfo.entityPrefix]?.flag}
            </Text>
          )}
          {(qso?.their?.state || qso?.their?.guess?.state) && (
            qso?.their?.state || qso?.their?.guess?.state
          )}
        </Text>
        <Text style={styles.fields.name}>
          {extendedWidth && (
            qso.their?.name ?? qso.their?.guess?.name ?? ''
          )}
        </Text>
        <Text style={styles.fields.icon}>
          {qso.notes && (
            <Icon source="note-outline" size={styles.oneSpace * 2} style={styles.fields.icon} />
          )}
          {(qso.refs || []).filter(ref => REFS_TO_INCLUDE[ref.type]).map(ref => ({ ref, handler: findBestHook(`ref:${ref.type}`) })).map(({ ref, handler }, i) => (
            <Icon key={i} source={handler?.icon} size={styles.oneSpace * 2} style={styles.fields.icon} color={styles.fields.icon.color} />
          ))}
        </Text>
        {qso?.their?.exchange ? (
          <>
            {extendedWidth && (
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
