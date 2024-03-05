import React, { useMemo } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'
import { View } from 'react-native'

import { activityIndex } from '../../activities'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { fmtFreqInMHz } from '../../../../tools/frequencyFormats'

export function guessItemHeight (qso, styles) {
  return styles.compactRow.height + styles.compactRow.borderBottomWidth
}

const REFS_TO_INCLUDE = {
  pota: true
}

const QSOItem = React.memo(function QSOItem ({ qso, ourInfo, onPress, styles, selected, extendedWidth }) {
  const theirInfo = useMemo(() => {
    if (qso?.their?.entityPrefix) {
      return qso?.their
    } else {
      let info = {}
      info = parseCallsign(qso?.their?.call)
      return annotateFromCountryFile(info)
    }
  }, [qso?.their])

  return (
    <TouchableRipple onPress={() => onPress && onPress({ qso })} style={{ backgroundColor: selected ? styles.theme.colors.secondaryLight : undefined }}>
      <View style={styles.compactRow}>
        <Text style={styles.fields.number}>{qso._number}</Text>
        <Text style={styles.fields.time}>{fmtShortTimeZulu(qso.startOnMillis)}</Text>
        <Text style={styles.fields.freq}>{qso.freq ? fmtFreqInMHz(qso.freq, { mode: 'compact' }) : qso.band}</Text>
        <Text style={styles.fields.call}>
          {qso.their?.call ?? '?'}
          {theirInfo?.entityPrefix && theirInfo.entityPrefix !== ourInfo?.entityPrefix && (
            <Text style={styles.fields.badges}>
              {' '}{DXCC_BY_PREFIX[theirInfo.entityPrefix]?.flag}
            </Text>
          )}

        </Text>
        {qso.notes && (
          <Icon source="note-outline" size={styles.oneSpace * 2} style={styles.fields.icon} />
        )}
        {(qso.refs || []).filter(ref => REFS_TO_INCLUDE[ref.type]).map(ref => ({ ref, activity: activityIndex[ref.type] })).map(({ ref, activity }, i) => (
          <Icon key={i} source={activity?.icon} size={styles.oneSpace * 2} style={styles.fields.icon} color={styles.fields.icon.color} />
        ))}
        {qso?.their?.exchange ? (
          <>
            {extendedWidth && (
              <Text style={styles.fields.signal}>{qso?.our?.sent}{'  '}{qso?.their?.sent}</Text>
            )}
            <Text style={styles.fields.exchange}>{qso?.their?.exchange}</Text>
          </>
        ) : (
          <Text style={styles.fields.signal}>{qso?.our?.sent}{'  '}{qso?.their?.sent}</Text>
        )}
      </View>
    </TouchableRipple>
  )
})
export default QSOItem
